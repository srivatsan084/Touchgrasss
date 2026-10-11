import base64
import io
import json
import math
import os
from datetime import datetime, timezone
from typing import Literal

import httpx
import jwt
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from geoalchemy2 import Geometry
from PIL import ExifTags, Image
from pydantic import BaseModel, Field
from sqlalchemy import DateTime, Integer, String, create_engine
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker


DATABASE_URL = os.getenv("DATABASE_URL")
AI_BASE_URL = os.getenv("AI_BASE_URL", "http://localhost:11434")
AI_MODEL = os.getenv("AI_MODEL", "llava:7b")
engine = create_engine(DATABASE_URL, pool_pre_ping=True) if DATABASE_URL else None
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False) if engine else None
app = FastAPI(title="TouchGrass API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","),
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)


class Base(DeclarativeBase):
    pass


class Activity(Base):
    __tablename__ = "activities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    owner_id: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    kind: Mapped[str] = mapped_column(String(20), nullable=False)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    distance_m: Mapped[int] = mapped_column(Integer, nullable=False)
    duration_s: Mapped[int] = mapped_column(Integer, nullable=False)
    start_location = mapped_column(Geometry("POINT", srid=4326, spatial_index=True), nullable=True)
    route_points: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    verification: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class RoutePoint(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    timestamp: datetime | None = None


class PhotoProof(BaseModel):
    image_base64: str | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    captured_at: datetime | None = None


class ActivitySubmission(BaseModel):
    kind: Literal["Hiking", "Running", "Cycling", "Diving"]
    title: str = Field(min_length=1, max_length=160)
    distance_m: int = Field(gt=0)
    duration_s: int = Field(gt=0)
    route_points: list[RoutePoint] = Field(min_length=2, max_length=20000)
    photos: list[PhotoProof] = Field(default_factory=list, max_length=12)


def authenticated_owner(authorization: str | None = Header(default=None)) -> str:
    secret = os.getenv("JWT_SECRET")
    if not secret:
        raise HTTPException(status_code=503, detail="JWT_SECRET is not configured")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Bearer token required")
    try:
        claims = jwt.decode(authorization[7:], secret, algorithms=["HS256"])
        owner_id = claims.get("sub")
        if not owner_id:
            raise HTTPException(status_code=401, detail="Token subject is missing")
        return str(owner_id)
    except jwt.PyJWTError as error:
        raise HTTPException(status_code=401, detail="Invalid bearer token") from error


def great_circle_m(a: RoutePoint, b: RoutePoint) -> float:
    radius = 6_371_000
    lat1, lat2 = math.radians(a.latitude), math.radians(b.latitude)
    dlat = lat2 - lat1
    dlon = math.radians(b.longitude - a.longitude)
    value = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * radius * math.asin(math.sqrt(value))


def read_photo_gps(image_base64: str) -> tuple[float, float] | None:
    try:
        image = Image.open(io.BytesIO(base64.b64decode(image_base64, validate=True)))
        gps = image.getexif().get_ifd(ExifTags.IFD.GPSInfo)
        gps = {ExifTags.GPSTAGS.get(key, key): value for key, value in gps.items()}

        def decimal(value, reference):
            degrees, minutes, seconds = (float(part) for part in value)
            result = degrees + minutes / 60 + seconds / 3600
            return -result if reference in ("S", "W") else result

        return decimal(gps["GPSLatitude"], gps["GPSLatitudeRef"]), decimal(gps["GPSLongitude"], gps["GPSLongitudeRef"])
    except (KeyError, TypeError, ValueError, OSError):
        return None


def nearest_route_distance_m(latitude: float, longitude: float, route: list[RoutePoint]) -> float:
    return min(
        math.hypot(
            (latitude - point.latitude) * 111_000,
            (longitude - point.longitude) * 111_000 * math.cos(math.radians(point.latitude)),
        )
        for point in route
    )


async def analyze_with_open_model(submission: ActivitySubmission, matching_photos: int) -> dict | None:
    prompt = (
        "Assess outdoor activity plausibility and photo consistency. This is an estimate, not proof. "
        "Return JSON only: confidence and photo_authenticity integers 0-100, summary under 20 words. "
        f"Activity={submission.kind}; route_distance={submission.distance_m}m; duration={submission.duration_s}s; "
        f"GPS_points={len(submission.route_points)}; photos_matching_route={matching_photos}."
    )
    payload = {"model": AI_MODEL, "prompt": prompt, "stream": False, "format": "json"}
    if submission.photos and submission.photos[0].image_base64:
        payload["images"] = [submission.photos[0].image_base64]
    try:
        async with httpx.AsyncClient(timeout=45) as client:
            response = await client.post(f"{AI_BASE_URL.rstrip('/')}/api/generate", json=payload)
            response.raise_for_status()
            result = json.loads(response.json()["response"])
            return {
                "confidence": max(0, min(100, int(result["confidence"]))),
                "photo_authenticity": max(0, min(100, int(result["photo_authenticity"]))),
                "summary": str(result.get("summary", "Model analysis complete"))[:180],
                "model": AI_MODEL,
                "source": "open-weight-model",
            }
    except (httpx.HTTPError, KeyError, ValueError, TypeError):
        return None


@app.on_event("startup")
def create_tables() -> None:
    if engine:
        Base.metadata.create_all(engine)


@app.get("/api/health")
def health():
    return {"status": "ok", "model": AI_MODEL, "database_configured": engine is not None}


@app.post("/api/activities/verify")
async def verify_activity(submission: ActivitySubmission, owner_id: str = Depends(authenticated_owner)):
    route_distance = sum(great_circle_m(a, b) for a, b in zip(submission.route_points, submission.route_points[1:]))
    gps_consistent = 0.65 <= route_distance / submission.distance_m <= 1.5
    photos_checked = 0
    photos_matching = 0
    for photo in submission.photos:
        gps = read_photo_gps(photo.image_base64) if photo.image_base64 else None
        if gps is None and photo.latitude is not None and photo.longitude is not None:
            gps = photo.latitude, photo.longitude
        if gps:
            photos_checked += 1
            photos_matching += nearest_route_distance_m(*gps, submission.route_points) <= 1_000

    model_result = await analyze_with_open_model(submission, photos_matching)
    if model_result is None:
        model_result = {
            "confidence": 55 if gps_consistent else 25,
            "photo_authenticity": 50 if photos_checked else 0,
            "summary": "Heuristic only; configure an Ollama vision model for AI analysis.",
            "model": None,
            "source": "heuristic-fallback",
        }

    checks = {
        "gps_route_distance_m": round(route_distance),
        "claimed_distance_m": submission.distance_m,
        "gps_distance_consistent": gps_consistent,
        "photos_with_matching_location": photos_matching,
        "photos_with_location_checked": photos_checked,
        "ai": model_result,
    }
    result = {"verified": gps_consistent and (photos_matching > 0 if submission.photos else True), **checks}
    if SessionLocal:
        first = submission.route_points[0]
        with SessionLocal() as session:
            record = Activity(
                owner_id=owner_id,
                kind=submission.kind,
                title=submission.title,
                distance_m=submission.distance_m,
                duration_s=submission.duration_s,
                start_location=f"SRID=4326;POINT({first.longitude} {first.latitude})",
                route_points=[point.model_dump(mode="json") for point in submission.route_points],
                verification=checks,
            )
            session.add(record)
            session.commit()
            result["activity_id"] = record.id
    else:
        result["activity_id"] = None
    result["grass_xp"] = 0
    result["note"] = "XP is withheld until a trusted verification policy approves this record."
    return result