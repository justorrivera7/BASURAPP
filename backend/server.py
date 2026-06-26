from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from fastapi.security import HTTPBearer
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import math
import random
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal
import uuid
import jwt
from datetime import datetime, timezone, timedelta


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'recolecta-secret-key-change-me')
JWT_ALG = 'HS256'

app = FastAPI(title="Recolecta API")
api_router = APIRouter(prefix="/api")

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')


# ====================== MODELS ======================

Role = Literal['resident', 'driver', 'admin']


def now_iso():
    return datetime.now(timezone.utc).isoformat()


class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    phone: str
    name: str
    role: Role = 'resident'
    address: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    created_at: str = Field(default_factory=now_iso)


class RequestOtpIn(BaseModel):
    phone: str


class VerifyOtpIn(BaseModel):
    phone: str
    code: str
    name: Optional[str] = None
    role: Optional[Role] = None


class UpdateAddressIn(BaseModel):
    address: str
    lat: float
    lng: float


class Truck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    plate: str
    driver_id: Optional[str] = None
    driver_name: Optional[str] = None
    lat: float = 19.4326
    lng: float = -99.1332
    status: Literal['idle', 'on_route', 'maintenance'] = 'idle'
    speed_kmh: float = 0.0
    updated_at: str = Field(default_factory=now_iso)


class TruckCreateIn(BaseModel):
    plate: str
    driver_id: Optional[str] = None


class LocationIn(BaseModel):
    lat: float
    lng: float
    speed_kmh: Optional[float] = 0.0


class Stop(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    address: str
    lat: float
    lng: float
    order: int
    status: Literal['pending', 'collected', 'skipped'] = 'pending'
    eta_minutes: Optional[int] = None
    scheduled_time: Optional[str] = None  # "HH:MM" — hora estimada de recogida


class Route(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    truck_id: str
    name: str
    date: str
    start_time: Optional[str] = None  # "HH:MM" — hora de inicio del recorrido
    stops: List[Stop] = []
    status: Literal['scheduled', 'in_progress', 'completed'] = 'scheduled'
    created_at: str = Field(default_factory=now_iso)


class RouteCreateIn(BaseModel):
    truck_id: str
    name: str
    date: str
    start_time: Optional[str] = None
    stops: List[dict] = []


class SpecialPickup(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    user_phone: str
    address: str
    lat: float
    lng: float
    waste_type: Literal['bulky', 'debris', 'electronics', 'green', 'hazardous']
    notes: Optional[str] = None
    preferred_date: str
    status: Literal['pending', 'scheduled', 'collected', 'cancelled'] = 'pending'
    assigned_truck_id: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)


class SpecialPickupIn(BaseModel):
    address: str
    lat: float
    lng: float
    waste_type: Literal['bulky', 'debris', 'electronics', 'green', 'hazardous']
    notes: Optional[str] = None
    preferred_date: str


class PickupStatusIn(BaseModel):
    status: Literal['pending', 'scheduled', 'collected', 'cancelled']
    assigned_truck_id: Optional[str] = None


class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    message: str
    type: Literal['eta', 'pickup', 'system'] = 'system'
    read: bool = False
    created_at: str = Field(default_factory=now_iso)


# ====================== AUTH HELPERS ======================

def create_token(user_id: str, role: str) -> str:
    payload = {
        'sub': user_id,
        'role': role,
        'exp': datetime.now(timezone.utc) + timedelta(days=30),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(401, "Missing token")
    token = authorization.split(' ', 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid token")
    user = await db.users.find_one({"id": payload['sub']}, {"_id": 0})
    if not user:
        raise HTTPException(401, "User not found")
    return user


def require_role(*roles):
    async def _checker(user: dict = Depends(get_current_user)):
        if user['role'] not in roles:
            raise HTTPException(403, "Forbidden")
        return user
    return _checker


# ====================== UTILS ======================

def haversine_km(lat1, lng1, lat2, lng2):
    R = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


# ====================== AUTH ROUTES ======================

@api_router.post("/auth/request-otp")
async def request_otp(payload: RequestOtpIn):
    phone = payload.phone.strip()
    if len(phone) < 6:
        raise HTTPException(400, "Invalid phone")
    code = f"{random.randint(0, 999999):06d}"
    expires = (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
    await db.otps.update_one(
        {"phone": phone},
        {"$set": {"phone": phone, "code": code, "expires_at": expires}},
        upsert=True,
    )
    logger.info(f"[MOCK OTP] phone={phone} code={code}")
    # In mock mode we return the code so the user can see it on screen
    return {"sent": True, "mock_code": code, "phone": phone}


@api_router.post("/auth/verify-otp")
async def verify_otp(payload: VerifyOtpIn):
    phone = payload.phone.strip()
    otp = await db.otps.find_one({"phone": phone}, {"_id": 0})
    if not otp or otp['code'] != payload.code:
        raise HTTPException(400, "Invalid code")
    if datetime.fromisoformat(otp['expires_at']) < datetime.now(timezone.utc):
        raise HTTPException(400, "Code expired")

    existing = await db.users.find_one({"phone": phone}, {"_id": 0})
    if existing:
        user = existing
    else:
        if not payload.name or not payload.role:
            raise HTTPException(400, "name and role required for first signup")
        user_obj = User(phone=phone, name=payload.name, role=payload.role)
        user = user_obj.model_dump()
        await db.users.insert_one(dict(user))

    await db.otps.delete_one({"phone": phone})
    token = create_token(user['id'], user['role'])
    return {"token": token, "user": user}


@api_router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@api_router.put("/me/address")
async def update_address(payload: UpdateAddressIn, user: dict = Depends(get_current_user)):
    await db.users.update_one(
        {"id": user['id']},
        {"$set": {"address": payload.address, "lat": payload.lat, "lng": payload.lng}},
    )
    updated = await db.users.find_one({"id": user['id']}, {"_id": 0})
    return updated


# ====================== TRUCKS ======================

@api_router.get("/trucks")
async def list_trucks(user: dict = Depends(get_current_user)):
    trucks = await db.trucks.find({}, {"_id": 0}).to_list(500)
    return trucks


@api_router.get("/trucks/{truck_id}")
async def get_truck(truck_id: str, user: dict = Depends(get_current_user)):
    t = await db.trucks.find_one({"id": truck_id}, {"_id": 0})
    if not t:
        raise HTTPException(404, "Not found")
    return t


@api_router.post("/trucks")
async def create_truck(payload: TruckCreateIn, user: dict = Depends(require_role('admin'))):
    driver = None
    if payload.driver_id:
        driver = await db.users.find_one({"id": payload.driver_id, "role": "driver"}, {"_id": 0})
    truck = Truck(
        plate=payload.plate,
        driver_id=payload.driver_id,
        driver_name=driver['name'] if driver else None,
    )
    await db.trucks.insert_one(truck.model_dump())
    return truck.model_dump()


@api_router.put("/trucks/{truck_id}/location")
async def update_truck_location(truck_id: str, payload: LocationIn, user: dict = Depends(get_current_user)):
    truck = await db.trucks.find_one({"id": truck_id}, {"_id": 0})
    if not truck:
        raise HTTPException(404, "Truck not found")
    if user['role'] == 'driver' and truck.get('driver_id') != user['id']:
        raise HTTPException(403, "Not your truck")
    await db.trucks.update_one(
        {"id": truck_id},
        {"$set": {
            "lat": payload.lat,
            "lng": payload.lng,
            "speed_kmh": payload.speed_kmh or 0,
            "status": "on_route",
            "updated_at": now_iso(),
        }},
    )
    updated = await db.trucks.find_one({"id": truck_id}, {"_id": 0})
    return updated


# ====================== ROUTES ======================

@api_router.get("/routes")
async def list_routes(user: dict = Depends(get_current_user)):
    if user['role'] == 'driver':
        trucks = await db.trucks.find({"driver_id": user['id']}, {"_id": 0}).to_list(50)
        truck_ids = [t['id'] for t in trucks]
        routes = await db.routes.find({"truck_id": {"$in": truck_ids}}, {"_id": 0}).to_list(500)
    else:
        routes = await db.routes.find({}, {"_id": 0}).to_list(500)
    return routes


@api_router.post("/routes")
async def create_route(payload: RouteCreateIn, user: dict = Depends(require_role('admin'))):
    stops = [Stop(**{**s, "order": i}).model_dump() for i, s in enumerate(payload.stops)]
    route = Route(
        truck_id=payload.truck_id,
        name=payload.name,
        date=payload.date,
        start_time=payload.start_time,
        stops=stops,
    )
    await db.routes.insert_one(route.model_dump())
    return route.model_dump()


@api_router.put("/routes/{route_id}/stops/{stop_id}/status")
async def update_stop_status(route_id: str, stop_id: str, payload: dict, user: dict = Depends(get_current_user)):
    new_status = payload.get('status', 'collected')
    route = await db.routes.find_one({"id": route_id}, {"_id": 0})
    if not route:
        raise HTTPException(404, "Route not found")
    stops = route['stops']
    found = False
    for s in stops:
        if s['id'] == stop_id:
            s['status'] = new_status
            found = True
            break
    if not found:
        raise HTTPException(404, "Stop not found")
    pending = [s for s in stops if s['status'] == 'pending']
    route_status = 'completed' if not pending else 'in_progress'
    await db.routes.update_one(
        {"id": route_id},
        {"$set": {"stops": stops, "status": route_status}},
    )
    return {"ok": True, "stops": stops, "status": route_status}


# ====================== RESIDENT ETA ======================

@api_router.get("/resident/eta")
async def resident_eta(user: dict = Depends(get_current_user)):
    if user.get('lat') is None or user.get('lng') is None:
        return {"available": False, "reason": "no_address"}

    trucks = await db.trucks.find({"status": "on_route"}, {"_id": 0}).to_list(50)
    if not trucks:
        return {"available": False, "reason": "no_active_truck"}

    # pick nearest truck
    best = None
    for t in trucks:
        d = haversine_km(user['lat'], user['lng'], t['lat'], t['lng'])
        if best is None or d < best['distance_km']:
            best = {"truck": t, "distance_km": d}

    avg_speed = max(best['truck'].get('speed_kmh', 0) or 0, 18)
    eta_min = int(round((best['distance_km'] / avg_speed) * 60))

    return {
        "available": True,
        "truck": best['truck'],
        "distance_km": round(best['distance_km'], 2),
        "eta_minutes": eta_min,
        "user_location": {"lat": user['lat'], "lng": user['lng']},
    }


# ====================== SPECIAL PICKUPS ======================

@api_router.post("/special-pickups")
async def create_special_pickup(payload: SpecialPickupIn, user: dict = Depends(get_current_user)):
    sp = SpecialPickup(
        user_id=user['id'],
        user_name=user['name'],
        user_phone=user['phone'],
        **payload.model_dump(),
    )
    await db.special_pickups.insert_one(sp.model_dump())
    # notify admin & user
    note = Notification(
        user_id=user['id'],
        title="Solicitud recibida",
        message=f"Tu recogida especial para {payload.address} fue registrada.",
        type='pickup',
    )
    await db.notifications.insert_one(note.model_dump())
    return sp.model_dump()


@api_router.get("/special-pickups")
async def list_special_pickups(user: dict = Depends(get_current_user)):
    if user['role'] == 'resident':
        q = {"user_id": user['id']}
    else:
        q = {}
    items = await db.special_pickups.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items


@api_router.put("/special-pickups/{pickup_id}")
async def update_special_pickup(pickup_id: str, payload: PickupStatusIn, user: dict = Depends(require_role('admin', 'driver'))):
    sp = await db.special_pickups.find_one({"id": pickup_id}, {"_id": 0})
    if not sp:
        raise HTTPException(404, "Not found")
    update = {"status": payload.status}
    if payload.assigned_truck_id is not None:
        update['assigned_truck_id'] = payload.assigned_truck_id
    await db.special_pickups.update_one({"id": pickup_id}, {"$set": update})
    # notify requester
    msg_map = {
        'scheduled': 'Tu recogida fue agendada.',
        'collected': 'Tu recogida fue completada. ¡Gracias!',
        'cancelled': 'Tu recogida fue cancelada.',
    }
    if payload.status in msg_map:
        note = Notification(
            user_id=sp['user_id'],
            title="Actualización de recogida",
            message=msg_map[payload.status],
            type='pickup',
        )
        await db.notifications.insert_one(note.model_dump())
    updated = await db.special_pickups.find_one({"id": pickup_id}, {"_id": 0})
    return updated


# ====================== NOTIFICATIONS ======================

@api_router.get("/notifications")
async def list_notifications(user: dict = Depends(get_current_user)):
    items = await db.notifications.find({"user_id": user['id']}, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)
    return items


@api_router.put("/notifications/{nid}/read")
async def mark_notification_read(nid: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one({"id": nid, "user_id": user['id']}, {"$set": {"read": True}})
    return {"ok": True}


# ====================== ADMIN ======================

@api_router.get("/admin/stats")
async def admin_stats(user: dict = Depends(require_role('admin'))):
    total_users = await db.users.count_documents({})
    residents = await db.users.count_documents({"role": "resident"})
    drivers = await db.users.count_documents({"role": "driver"})
    trucks_total = await db.trucks.count_documents({})
    trucks_active = await db.trucks.count_documents({"status": "on_route"})
    pending_pickups = await db.special_pickups.count_documents({"status": "pending"})
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    routes_today = await db.routes.count_documents({"date": today})
    return {
        "total_users": total_users,
        "residents": residents,
        "drivers": drivers,
        "trucks_total": trucks_total,
        "trucks_active": trucks_active,
        "pending_pickups": pending_pickups,
        "routes_today": routes_today,
    }


@api_router.get("/admin/users")
async def list_users(user: dict = Depends(require_role('admin'))):
    users = await db.users.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return users


@api_router.get("/")
async def root():
    return {"message": "Recolecta API", "version": "1.0"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


# ====================== SEED DEMO ======================

@app.on_event("startup")
async def seed_demo_data():
    try:
        if await db.users.count_documents({}) > 0:
            return
        logger.info("Seeding demo data...")

        # Mexico City reference center
        center_lat, center_lng = 19.4326, -99.1332

        admin = User(phone="5550000001", name="Admin Municipal", role="admin").model_dump()
        driver1 = User(phone="5550000002", name="Juan Camionero", role="driver").model_dump()
        driver2 = User(phone="5550000003", name="María Conductora", role="driver").model_dump()
        resident = User(
            phone="5550000004", name="Carlos Vecino", role="resident",
            address="Av. Reforma 222, CDMX",
            lat=center_lat + 0.005, lng=center_lng + 0.003,
        ).model_dump()
        await db.users.insert_many([admin, driver1, driver2, resident])

        truck1 = Truck(plate="CDMX-001", driver_id=driver1['id'], driver_name=driver1['name'],
                       lat=center_lat + 0.001, lng=center_lng + 0.001, status='on_route',
                       speed_kmh=22).model_dump()
        truck2 = Truck(plate="CDMX-002", driver_id=driver2['id'], driver_name=driver2['name'],
                       lat=center_lat - 0.008, lng=center_lng - 0.005, status='idle').model_dump()
        await db.trucks.insert_many([truck1, truck2])

        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        stops = [
            Stop(address="Calle Hidalgo 10", lat=center_lat + 0.002, lng=center_lng + 0.002, order=0, eta_minutes=8, scheduled_time="07:15").model_dump(),
            Stop(address="Av. Juárez 55", lat=center_lat + 0.004, lng=center_lng + 0.003, order=1, eta_minutes=18, scheduled_time="07:30").model_dump(),
            Stop(address="Calle Madero 12", lat=center_lat + 0.006, lng=center_lng + 0.005, order=2, eta_minutes=28, scheduled_time="07:45").model_dump(),
            Stop(address="Plaza República 1", lat=center_lat + 0.008, lng=center_lng + 0.007, order=3, eta_minutes=38, scheduled_time="08:00").model_dump(),
        ]
        route1 = Route(truck_id=truck1['id'], name="Ruta Centro AM", date=today, start_time="07:00", stops=stops, status='in_progress').model_dump()
        await db.routes.insert_one(route1)

        logger.info("Demo data seeded.")
    except Exception as e:
        logger.exception(f"Seed failed: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
