from fastapi import APIRouter
from typing import Optional
import math
import urllib.request
import json
import os

router = APIRouter()

# Google Places API Key (free tier: 28,500 requests/month)
GOOGLE_PLACES_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY", "")

# Fallback static data (used when API fails)
HOSPITALS = [
    {"id": 1,  "name": "Apollo Hospital",       "type": "hospital",  "lat": 19.0760, "lng": 72.8777, "rating": 4.5, "phone": "+91-22-6620-0000", "address": "Navi Mumbai", "website": "https://www.apollohospitals.com"},
    {"id": 2,  "name": "Fortis Healthcare",      "type": "hospital",  "lat": 19.1136, "lng": 72.8697, "rating": 4.3, "phone": "+91-22-4202-3000", "address": "Mulund, Mumbai", "website": "https://www.fortishealthcare.com"},
    {"id": 3,  "name": "Kokilaben Hospital",     "type": "hospital",  "lat": 19.1315, "lng": 72.8265, "rating": 4.7, "phone": "+91-22-3090-0000", "address": "Andheri West", "website": "https://www.kokilabenhospital.com"},
    {"id": 4,  "name": "Lilavati Hospital",      "type": "hospital",  "lat": 19.0500, "lng": 72.8270, "rating": 4.4, "phone": "+91-22-2675-1000", "address": "Bandra West", "website": "https://www.lilavatihospital.com"},
    {"id": 5,  "name": "Hinduja Hospital",       "type": "hospital",  "lat": 19.0421, "lng": 72.8368, "rating": 4.3, "phone": "+91-22-2445-1515", "address": "Mahim", "website": "https://www.hindujahospital.com"},
    {"id": 6,  "name": "Wockhardt Hospital",     "type": "hospital",  "lat": 19.0231, "lng": 72.8422, "rating": 4.2, "phone": "+91-22-6178-5000", "address": "South Mumbai", "website": "https://www.wockhardthospitals.com"},
    {"id": 7,  "name": "Nanavati Hospital",      "type": "hospital",  "lat": 19.0897, "lng": 72.8394, "rating": 4.5, "phone": "+91-22-2619-0000", "address": "Vile Parle West", "website": "https://www.nanavatihospital.org"},
    {"id": 8,  "name": "Breach Candy Hospital",  "type": "hospital",  "lat": 18.9730, "lng": 72.8095, "rating": 4.4, "phone": "+91-22-2367-0000", "address": "Breach Candy", "website": "https://www.breachcandyhospital.org"},
    {"id": 9,  "name": "Jaslok Hospital",        "type": "hospital",  "lat": 18.9714, "lng": 72.8074, "rating": 4.3, "phone": "+91-22-6657-3333", "address": "Pedder Road", "website": "https://www.jaslokhospital.net"},
    {"id": 10, "name": "Bombay Hospital",        "type": "hospital",  "lat": 18.9388, "lng": 72.8347, "rating": 4.2, "phone": "+91-22-2206-7676", "address": "Marine Lines", "website": "https://www.bombayhospital.com"},
    
    {"id": 20, "name": "Sunrise Clinic",         "type": "clinic",    "lat": 19.0596, "lng": 72.8295, "rating": 4.1, "phone": "+91-22-2642-0000", "address": "Bandra East"},
    {"id": 21, "name": "MedCare Clinic",         "type": "clinic",    "lat": 19.1700, "lng": 72.9634, "rating": 4.0, "phone": "+91-22-2101-0000", "address": "Thane"},
    {"id": 22, "name": "CityHealth Clinic",      "type": "clinic",    "lat": 19.0900, "lng": 72.8600, "rating": 4.2, "phone": "+91-22-2789-0000", "address": "Andheri East"},
    {"id": 23, "name": "Kalyan Clinic",          "type": "clinic",    "lat": 19.2183, "lng": 73.1300, "rating": 3.9, "phone": "+91-251-220-0000", "address": "Kalyan East"},
    {"id": 24, "name": "Family Care Clinic",     "type": "clinic",    "lat": 19.0176, "lng": 72.8562, "rating": 4.0, "phone": "+91-22-2414-5000", "address": "Dadar West"},
    {"id": 25, "name": "HealthFirst Clinic",     "type": "clinic",    "lat": 19.1073, "lng": 72.8371, "rating": 4.1, "phone": "+91-22-2610-3000", "address": "Santacruz West"},
    {"id": 26, "name": "Prime Care Clinic",      "type": "clinic",    "lat": 19.0625, "lng": 72.8352, "rating": 4.3, "phone": "+91-22-2655-8000", "address": "Khar West"},
    
    {"id": 40, "name": "Apollo Pharmacy",        "type": "pharmacy",  "lat": 19.0880, "lng": 72.8410, "rating": 4.2, "phone": "+91-22-2667-5000", "address": "Andheri", "website": "https://www.apollopharmacy.in"},
    {"id": 41, "name": "MedPlus Pharmacy",       "type": "pharmacy",  "lat": 19.0330, "lng": 72.8510, "rating": 4.3, "phone": "+91-22-2493-0000", "address": "Dadar", "website": "https://www.medplusmart.com"},
    {"id": 42, "name": "Netmeds Pharmacy",       "type": "pharmacy",  "lat": 19.1200, "lng": 72.8650, "rating": 4.0, "phone": "+91-22-2891-0000", "address": "Jogeshwari", "website": "https://www.netmeds.com"},
    {"id": 43, "name": "Wellness Forever",       "type": "pharmacy",  "lat": 19.0760, "lng": 72.8777, "rating": 4.4, "phone": "+91-22-6161-6161", "address": "Navi Mumbai", "website": "https://www.wellnessforever.com"},
    {"id": 44, "name": "PharmEasy Store",        "type": "pharmacy",  "lat": 19.0596, "lng": 72.8295, "rating": 4.1, "phone": "+91-22-4848-4848", "address": "Bandra", "website": "https://www.pharmeasy.in"},
    {"id": 45, "name": "1mg Pharmacy",           "type": "pharmacy",  "lat": 19.1136, "lng": 72.8697, "rating": 4.2, "phone": "+91-22-4949-4949", "address": "Mulund", "website": "https://www.1mg.com"},
    {"id": 46, "name": "Noble Plus Pharmacy",    "type": "pharmacy",  "lat": 19.0421, "lng": 72.8368, "rating": 4.0, "phone": "+91-22-2445-2000", "address": "Mahim"},
    {"id": 47, "name": "LifeCare Pharmacy",      "type": "pharmacy",  "lat": 18.9730, "lng": 72.8095, "rating": 4.3, "phone": "+91-22-2367-5000", "address": "Breach Candy"},
    {"id": 48, "name": "Guardian Pharmacy",      "type": "pharmacy",  "lat": 19.1315, "lng": 72.8265, "rating": 4.1, "phone": "+91-22-3090-5000", "address": "Andheri West"},
    {"id": 49, "name": "Sai Medical Store",      "type": "pharmacy",  "lat": 19.0500, "lng": 72.8270, "rating": 4.0, "phone": "+91-22-2675-2000", "address": "Bandra West"},
    {"id": 50, "name": "Health & Glow Pharmacy", "type": "pharmacy",  "lat": 19.0231, "lng": 72.8422, "rating": 4.2, "phone": "+91-22-6178-6000", "address": "South Mumbai", "website": "https://www.healthandglow.com"},
    {"id": 51, "name": "Frank Ross Pharmacy",    "type": "pharmacy",  "lat": 19.0176, "lng": 72.8562, "rating": 4.1, "phone": "+91-22-2414-6000", "address": "Dadar West"},
    {"id": 52, "name": "Zeno Health Pharmacy",   "type": "pharmacy",  "lat": 19.1073, "lng": 72.8371, "rating": 4.3, "phone": "+91-22-2610-4000", "address": "Santacruz West"},
]

OUTBREAK_ZONES = [
    {"id": 1, "disease": "Dengue",    "severity": "high",   "lat": 19.2183, "lng": 72.9781, "cases": 145, "area": "Vasai-Virar"},
    {"id": 2, "disease": "Influenza", "severity": "medium", "lat": 19.1663, "lng": 73.0283, "cases": 87,  "area": "Kalyan"},
    {"id": 3, "disease": "Typhoid",   "severity": "low",    "lat": 18.9667, "lng": 72.8333, "cases": 32,  "area": "Colaba"},
    {"id": 4, "disease": "Malaria",   "severity": "medium", "lat": 19.2094, "lng": 72.8466, "cases": 61,  "area": "Borivali"},
]

def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.asin(math.sqrt(a))


def fetch_google_places(lat: float, lng: float, radius_m: int = 5000):
    """Fetch real places from Google Places API with phone numbers and details"""
    if not GOOGLE_PLACES_API_KEY:
        return None
    
    places = []
    place_types = ["hospital", "pharmacy", "doctor", "health"]
    
    for place_type in place_types:
        try:
            # Nearby Search API
            url = f"https://maps.googleapis.com/maps/api/place/nearbysearch/json?location={lat},{lng}&radius={radius_m}&type={place_type}&key={GOOGLE_PLACES_API_KEY}"
            
            req = urllib.request.Request(url)
            req.add_header("User-Agent", "LifeSet Health App")
            
            with urllib.request.urlopen(req, timeout=10) as resp:
                result = json.loads(resp.read().decode())
            
            for place in result.get("results", [])[:15]:  # Limit to 15 per type
                place_id = place.get("place_id")
                
                # Get detailed info including phone number
                details = get_place_details(place_id) if place_id else {}
                
                place_lat = place.get("geometry", {}).get("location", {}).get("lat")
                place_lng = place.get("geometry", {}).get("location", {}).get("lng")
                
                if not place_lat or not place_lng:
                    continue
                
                # Determine type
                types = place.get("types", [])
                if "hospital" in types:
                    p_type = "hospital"
                elif "pharmacy" in types or "drugstore" in types:
                    p_type = "pharmacy"
                else:
                    p_type = "clinic"
                
                dist = haversine(lat, lng, place_lat, place_lng)
                
                places.append({
                    "id": place_id or place.get("id", len(places) + 1000),
                    "name": place.get("name", "Healthcare Facility"),
                    "type": p_type,
                    "lat": place_lat,
                    "lng": place_lng,
                    "rating": place.get("rating", 4.0),
                    "user_ratings_total": place.get("user_ratings_total", 0),
                    "phone": details.get("phone", ""),
                    "phone_international": details.get("phone_international", ""),
                    "address": place.get("vicinity", details.get("address", "")),
                    "distance_km": round(dist, 2),
                    "opening_hours": details.get("opening_hours", place.get("opening_hours", {}).get("open_now", None)),
                    "is_open": place.get("opening_hours", {}).get("open_now"),
                    "website": details.get("website", ""),
                    "google_maps_url": details.get("url", f"https://www.google.com/maps/place/?q=place_id:{place_id}"),
                    "directions_url": f"https://www.google.com/maps/dir/?api=1&destination={place_lat},{place_lng}&destination_place_id={place_id}&travelmode=driving",
                    "walking_url": f"https://www.google.com/maps/dir/?api=1&destination={place_lat},{place_lng}&destination_place_id={place_id}&travelmode=walking",
                    "transit_url": f"https://www.google.com/maps/dir/?api=1&destination={place_lat},{place_lng}&destination_place_id={place_id}&travelmode=transit",
                    "photo_url": get_place_photo(place.get("photos", [{}])[0].get("photo_reference")) if place.get("photos") else None,
                })
                
        except Exception as e:
            print(f"Google Places API error for {place_type}: {e}")
            continue
    
    # Remove duplicates by place_id
    seen = set()
    unique_places = []
    for p in places:
        if p["id"] not in seen:
            seen.add(p["id"])
            unique_places.append(p)
    
    unique_places.sort(key=lambda x: x["distance_km"])
    return unique_places if unique_places else None


def get_place_details(place_id: str):
    """Get detailed place info including phone number from Google Places API"""
    if not GOOGLE_PLACES_API_KEY or not place_id:
        return {}
    
    try:
        url = f"https://maps.googleapis.com/maps/api/place/details/json?place_id={place_id}&fields=formatted_phone_number,international_phone_number,formatted_address,website,url,opening_hours&key={GOOGLE_PLACES_API_KEY}"
        
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=5) as resp:
            result = json.loads(resp.read().decode())
        
        details = result.get("result", {})
        return {
            "phone": details.get("formatted_phone_number", ""),
            "phone_international": details.get("international_phone_number", ""),
            "address": details.get("formatted_address", ""),
            "website": details.get("website", ""),
            "url": details.get("url", ""),
            "opening_hours": details.get("opening_hours", {}).get("weekday_text", []),
        }
    except Exception as e:
        print(f"Place details error: {e}")
        return {}


def get_place_photo(photo_reference: str, max_width: int = 400):
    """Get photo URL from Google Places API"""
    if not GOOGLE_PLACES_API_KEY or not photo_reference:
        return None
    return f"https://maps.googleapis.com/maps/api/place/photo?maxwidth={max_width}&photo_reference={photo_reference}&key={GOOGLE_PLACES_API_KEY}"

def fetch_osm_places(lat: float, lng: float, radius_m: int = 5000):
    """Fetch real places from OpenStreetMap Overpass API"""
    query = f"""
    [out:json][timeout:10];
    (
      node["amenity"="hospital"](around:{radius_m},{lat},{lng});
      node["amenity"="clinic"](around:{radius_m},{lat},{lng});
      node["amenity"="pharmacy"](around:{radius_m},{lat},{lng});
      way["amenity"="hospital"](around:{radius_m},{lat},{lng});
    );
    out center body;
    """
    
    try:
        url = "https://overpass-api.de/api/interpreter"
        data = urllib.parse.urlencode({"data": query}).encode()
        req = urllib.request.Request(url, data=data, method="POST")
        req.add_header("User-Agent", "LifeSet Health App/1.0")
        
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = json.loads(resp.read().decode())
            
        places = []
        for i, elem in enumerate(result.get("elements", [])):
            tags = elem.get("tags", {})
            
            # Get coordinates (for ways, use center)
            place_lat = elem.get("lat") or elem.get("center", {}).get("lat")
            place_lng = elem.get("lon") or elem.get("center", {}).get("lon")
            
            if not place_lat or not place_lng:
                continue
                
            # Determine type
            amenity = tags.get("amenity", "")
            healthcare = tags.get("healthcare", "")
            
            if amenity == "hospital" or healthcare == "hospital":
                place_type = "hospital"
            elif amenity == "pharmacy":
                place_type = "pharmacy"
            else:
                place_type = "clinic"
            
            name = tags.get("name", tags.get("operator", f"Healthcare Facility #{i+1}"))
            
            dist = haversine(lat, lng, place_lat, place_lng)
            
            places.append({
                "id": elem.get("id", i + 1000),
                "name": name,
                "type": place_type,
                "lat": place_lat,
                "lng": place_lng,
                "rating": round(3.5 + (hash(name) % 15) / 10, 1),  # Simulated rating
                "phone": tags.get("phone", tags.get("contact:phone", "N/A")),
                "address": tags.get("addr:full", tags.get("addr:street", tags.get("addr:city", ""))),
                "distance_km": round(dist, 2),
                "opening_hours": tags.get("opening_hours", ""),
                "website": tags.get("website", tags.get("contact:website", "")),
                "directions_url": f"https://www.google.com/maps/dir/?api=1&destination={place_lat},{place_lng}&travelmode=driving",
                "walking_url": f"https://www.google.com/maps/dir/?api=1&destination={place_lat},{place_lng}&travelmode=walking",
                "transit_url": f"https://www.google.com/maps/dir/?api=1&destination={place_lat},{place_lng}&travelmode=transit",
            })
        
        places.sort(key=lambda x: x["distance_km"])
        return places if places else None
        
    except Exception as e:
        print(f"OSM API error: {e}")
        return None

import urllib.parse

@router.get("/hospitals")
def get_hospitals(lat: Optional[float] = None, lng: Optional[float] = None):
    # Try Google Places API first (has phone numbers)
    if lat is not None and lng is not None and GOOGLE_PLACES_API_KEY:
        google_places = fetch_google_places(lat, lng, radius_m=10000)
        if google_places and len(google_places) > 0:
            return google_places
    
    # Try OpenStreetMap as fallback
    if lat is not None and lng is not None:
        osm_places = fetch_osm_places(lat, lng, radius_m=10000)
        if osm_places and len(osm_places) > 0:
            return osm_places
    
    # Fallback to static data
    hospitals = [dict(h) for h in HOSPITALS]
    for h in hospitals:
        h["directions_url"] = f"https://www.google.com/maps/dir/?api=1&destination={h['lat']},{h['lng']}&travelmode=driving"
        h["walking_url"] = f"https://www.google.com/maps/dir/?api=1&destination={h['lat']},{h['lng']}&travelmode=walking"
        h["transit_url"] = f"https://www.google.com/maps/dir/?api=1&destination={h['lat']},{h['lng']}&travelmode=transit"
        if lat is not None and lng is not None:
            h["distance_km"] = round(haversine(lat, lng, h["lat"], h["lng"]), 2)
    if lat is not None and lng is not None:
        hospitals.sort(key=lambda x: x["distance_km"])
    return hospitals

@router.get("/nearby")
def get_nearby(lat: float, lng: float, radius_km: float = 15, type: Optional[str] = None):
    # Try to fetch real data from OpenStreetMap
    osm_places = fetch_osm_places(lat, lng, radius_m=int(radius_km * 1000))
    
    if osm_places and len(osm_places) > 0:
        # Filter by type if specified
        if type:
            osm_places = [p for p in osm_places if p["type"] == type]
        return osm_places
    
    # Fallback to static data
    results = []
    for h in HOSPITALS:
        if type and h["type"] != type:
            continue
        dist = haversine(lat, lng, h["lat"], h["lng"])
        if dist <= radius_km:
            item = dict(h)
            item["distance_km"] = round(dist, 2)
            item["directions_url"] = f"https://www.google.com/maps/dir/?api=1&destination={h['lat']},{h['lng']}&travelmode=driving"
            item["walking_url"] = f"https://www.google.com/maps/dir/?api=1&destination={h['lat']},{h['lng']}&travelmode=walking"
            item["transit_url"] = f"https://www.google.com/maps/dir/?api=1&destination={h['lat']},{h['lng']}&travelmode=transit"
            results.append(item)
    results.sort(key=lambda x: x["distance_km"])
    return results

@router.get("/outbreaks")
def get_outbreaks():
    return OUTBREAK_ZONES
