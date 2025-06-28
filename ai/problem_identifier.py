import os
import google.generativeai as genai
from typing import Optional, Dict, List
import requests

# Define the categories and subcategories EXACTLY as in frontend
CATEGORIES = [
    { "id": "plumber", "name": "Plumber", "icon": "💧" },
    { "id": "electrician", "name": "Electrician", "icon": "⚡" },
    { "id": "carpenter", "name": "Carpenter", "icon": "🔨" },
    { "id": "mechanic", "name": "Mechanic", "icon": "🔧" },
    { "id": "mens_grooming", "name": "Men's Grooming", "icon": "💈" },
    { "id": "women_grooming", "name": "Women's Grooming", "icon": "💅" },
]

SUBCATEGORY_MAP = {
    "plumber": ["Tape Repair", "Leak Fixing", "Pipe Installation", "Drain Cleaning", "Toilet Repair", "Water Heater Repair"],
    "electrician": ["Electrical Repair", "Wiring Installation", "Switch & Socket Repair", "Fan Installation", "Light Installation", "MCB or Fuse Repair"],
    "carpenter": ["Wood Work", "Furniture Assembly", "Door/Window Repair", "Cabinet Installation", "Custom Shelves"],
    "mechanic": ["Car Service", "Bike Service", "Emergency Service", "Tire Change"],
    "mens_grooming": ["Haircut", "Shaving", "Facial", "Hair Color", "Massage"],
    "women_grooming": ["Facial", "Hair Color", "Body Massage"],
}

# EXACT keyword mapping based on frontend subcategories
KEYWORD_MAPPING = {
    # Plumber keywords
    "plumber": "plumber",
    "plumbing": "plumber",
    "tap": "plumber",
    "tape": "plumber",
    "leak": "plumber",
    "pipe": "plumber",
    "drain": "plumber",
    "toilet": "plumber",
    "water heater": "plumber",
    "geyser": "plumber",
    "faucet": "plumber",
    "sink": "plumber",
    "shower": "plumber",
    "bathroom": "plumber",
    "kitchen": "plumber",
    "water": "plumber",
    
    # Electrician keywords
    "electrician": "electrician",
    "electrical": "electrician",
    "wire": "electrician",
    "wiring": "electrician",
    "switch": "electrician",
    "socket": "electrician",
    "fan": "electrician",
    "light": "electrician",
    "mcb": "electrician",
    "fuse": "electrician",
    "circuit": "electrician",
    "power": "electrician",
    "voltage": "electrician",
    "outlet": "electrician",
    "bulb": "electrician",
    "lamp": "electrician",
    
    # Carpenter keywords
    "carpenter": "carpenter",
    "carpentry": "carpenter",
    "wood": "carpenter",
    "furniture": "carpenter",
    "cabinet": "carpenter",
    "shelf": "carpenter",
    "shelves": "carpenter",
    "window": "carpenter",
    "door": "carpenter",
    "table": "carpenter",
    "chair": "carpenter",
    "bed": "carpenter",
    "wardrobe": "carpenter",
    "wooden": "carpenter",
    "assembly": "carpenter",
    
    # Mechanic keywords
    "mechanic": "mechanic",
    "car": "mechanic",
    "bike": "mechanic",
    "vehicle": "mechanic",
    "engine": "mechanic",
    "tire": "mechanic",
    "tyre": "mechanic",
    "brake": "mechanic",
    "service": "mechanic",
    "automobile": "mechanic",
    "motorcycle": "mechanic",
    "scooter": "mechanic",
    "oil": "mechanic",
    "battery": "mechanic",
    "clutch": "mechanic",
    "gearbox": "mechanic",
    "emergency": "mechanic",
    
    # Men's grooming keywords
    "mens_grooming": "mens_grooming",
    "men_grooming": "mens_grooming",
    "haircut": "mens_grooming",
    "shaving": "mens_grooming",
    "beard": "mens_grooming",
    "massage": "mens_grooming",
    "barber": "mens_grooming",
    "hair": "mens_grooming",
    "facial": "mens_grooming",
    "trim": "mens_grooming",
    "grooming": "mens_grooming",
    "hair color": "mens_grooming",
    "haircolour": "mens_grooming",
    
    # Women's grooming keywords
    "women_grooming": "women_grooming",
    "women_grooming": "women_grooming",
    "salon": "women_grooming",
    "beauty": "women_grooming",
    "spa": "women_grooming",
    "makeup": "women_grooming",
    "manicure": "women_grooming",
    "pedicure": "women_grooming",
    "waxing": "women_grooming",
    "threading": "women_grooming",
    "body massage": "women_grooming",
    "facial": "women_grooming",
    "hair color": "women_grooming",
    "haircolour": "women_grooming",
}

# Configure Gemini API
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY is not configured. Check your .env file in the 'ai' folder.")
genai.configure(api_key=api_key)

def get_workers_by_specialization(category: str, subcategory: str = None) -> Dict:
    """
    Fetch workers from backend by specialization category and subcategory
    """
    try:
        # Replace with your actual backend URL
        backend_url = os.getenv("BACKEND_URL", "http://localhost:5000")
        
        if subcategory:
            # Convert display name to enum value for backend
            subcategory_enum = get_subcategory_enum(subcategory)
            response = requests.get(f"{backend_url}/api/v1/specializations/workers/{category}/{subcategory_enum}")
        else:
            response = requests.get(f"{backend_url}/api/v1/specializations/workers/{category}")
        
        if response.status_code == 200:
            return response.json()
        else:
            return {"error": f"Failed to fetch workers: {response.status_code}"}
    except Exception as e:
        return {"error": f"Error connecting to backend: {str(e)}"}

def get_subcategory_enum(display_name: str) -> str:
    """
    Convert display name to backend enum value
    """
    enum_mapping = {
        # Plumber
        "Tape Repair": "tape_repair",
        "Leak Fixing": "leak_fixing", 
        "Pipe Installation": "pipe_installation",
        "Drain Cleaning": "drain_cleaning",
        "Toilet Repair": "toilet_repair",
        "Water Heater Repair": "water_repair",
        
        # Electrician
        "Electrical Repair": "electrical_repair",
        "Wiring Installation": "wiring_installation",
        "Switch & Socket Repair": "switch_and_socket_repair",
        "Fan Installation": "fan_installation",
        "Light Installation": "light_installation",
        "MCB or Fuse Repair": "mcb_or_fuse_repair",
        
        # Carpenter
        "Wood Work": "wood_work",
        "Furniture Assembly": "furniture_assembly",
        "Door/Window Repair": "window_repair",
        "Cabinet Installation": "cabinate_installation",
        "Custom Shelves": "custom_shelves",
        
        # Mechanic
        "Car Service": "car_service",
        "Bike Service": "bike_service",
        "Emergency Service": "emergency_service",
        "Tire Change": "tire_change",
        
        # Men's Grooming
        "Haircut": "haircut",
        "Shaving": "saving",
        "Facial": "facial",
        "Hair Color": "hair_color",
        "Massage": "full_body_massage",
        
        # Women's Grooming
        "Body Massage": "body_massage",
    }
    
    return enum_mapping.get(display_name, display_name.lower().replace(" ", "_"))

def find_best_subcategory_match(category: str, user_prompt: str) -> str:
    """
    Find the best matching subcategory for the given category and user prompt
    """
    if category not in SUBCATEGORY_MAP:
        return None
    
    subcategories = SUBCATEGORY_MAP[category]
    user_prompt_lower = user_prompt.lower()
    
    # Find the subcategory with the most matching words
    best_match = None
    best_score = 0
    
    for subcategory in subcategories:
        subcategory_lower = subcategory.lower()
        score = 0
        
        # Check for exact word matches
        for word in subcategory_lower.split():
            if word in user_prompt_lower:
                score += 1
        
        # Check for partial matches
        for word in user_prompt_lower.split():
            if any(word in sub for sub in subcategory_lower.split()):
                score += 0.5
        
        if score > best_score:
            best_score = score
            best_match = subcategory
    
    return best_match if best_score > 0 else None

def analyze_file_content(file_path: str, user_prompt: str) -> str:
    """
    Analyze uploaded file (image/video) to enhance the user prompt
    """
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Determine file type
        file_extension = file_path.lower().split('.')[-1]
        is_image = file_extension in ['jpg', 'jpeg', 'png', 'gif', 'webp']
        is_video = file_extension in ['mp4', 'avi', 'mov', 'wmv', 'flv']
        
        if is_image:
            prompt = f"""
            Analyze this image and describe what service might be needed.
            User's description: "{user_prompt}"
            
            Look for:
            - Plumbing issues (leaks, broken pipes, clogged drains, etc.)
            - Electrical problems (broken switches, wiring issues, etc.)
            - Carpentry needs (broken furniture, door/window issues, etc.)
            - Mechanical problems (car/bike issues, etc.)
            - Grooming needs (hair, beauty services, etc.)
            
            Provide a brief description of what you see that relates to service needs.
            """
        elif is_video:
            prompt = f"""
            Analyze this video and describe what service might be needed.
            User's description: "{user_prompt}"
            
            Look for:
            - Plumbing issues (leaks, broken pipes, clogged drains, etc.)
            - Electrical problems (broken switches, wiring issues, etc.)
            - Carpentry needs (broken furniture, door/window issues, etc.)
            - Mechanical problems (car/bike issues, etc.)
            - Grooming needs (hair, beauty services, etc.)
            
            Provide a brief description of what you see that relates to service needs.
            """
        else:
            return user_prompt
        
        # Upload and analyze the file
        uploaded_file = genai.upload_file(path=file_path)
        response = model.generate_content([prompt, uploaded_file])
        
        # Combine user prompt with file analysis
        file_analysis = response.text.strip()
        enhanced_prompt = f"{user_prompt}. File analysis: {file_analysis}"
        
        return enhanced_prompt
        
    except Exception as e:
        print(f"File analysis failed: {e}")
        return user_prompt

def get_service_keyword_from_gemini(user_prompt: str, file_path: Optional[str] = None) -> Dict[str, any]:
    """
    Detect the language of the prompt, translate it if needed, and extract the most relevant service keyword.
    Returns category, subcategory, and workers data with redirect URL.

    Args:
        user_prompt (str): The user's input.
        file_path (Optional[str]): Optional path to a file that should be included in the prompt.

    Returns:
        dict: A dictionary with the detected category, subcategory, workers data, and redirect URL.
    """
    try:
        # Enhance prompt with file analysis if file is provided
        enhanced_prompt = user_prompt
        if file_path:
            enhanced_prompt = analyze_file_content(file_path, user_prompt)
        
        model = genai.GenerativeModel('gemini-1.5-flash')

        # Create a comprehensive prompt for the AI
        categories_text = "\n".join([f"- {cat['name']} ({cat['id']})" for cat in CATEGORIES])
        
        prompt = [
            (
                "You are a multilingual service-request interpreter.\n"
                "Step 1: Detect the language of the user's message. If it's not in English, translate it.\n"
                "Step 2: Based on the English request, choose the most relevant category from the list below.\n"
                "Step 3: Output only the category ID in lowercase. No extra text or explanation.\n\n"
                f"Available Categories:\n{categories_text}\n\n"
                f"User Request: \"{enhanced_prompt}\""
            )
        ]

        response = model.generate_content(prompt)
        raw_output = response.text.strip().lower().replace('.', '').replace('\n', '')

        # Validate or approximate match the output
        detected_category = None
        
        # First check if it's a direct match
        if raw_output in [cat['id'] for cat in CATEGORIES]:
            detected_category = raw_output
        else:
            # Try to find a match in the keyword mapping
            for keyword, category in KEYWORD_MAPPING.items():
                if keyword in raw_output:
                    detected_category = category
                    break

        if not detected_category:
            # Fallback: try to find the best match based on keyword similarity
            for keyword, category in KEYWORD_MAPPING.items():
                if any(word in enhanced_prompt.lower() for word in keyword.split()):
                    detected_category = category
                    break

        if not detected_category:
            raise ValueError(f"Could not determine service category for: '{enhanced_prompt}'")

        # Find the best matching subcategory
        detected_subcategory = find_best_subcategory_match(detected_category, enhanced_prompt)
        
        # Get category name for display
        category_name = next((cat['name'] for cat in CATEGORIES if cat['id'] == detected_category), detected_category)
        
        # Fetch workers from backend
        workers_data = get_workers_by_specialization(detected_category, detected_subcategory)
        
        # Create redirect URL to exact booking page
        redirect_url = f"/booking/services?service={encodeURIComponent(category_name)}"
        if detected_subcategory:
            redirect_url += f"&subcategory={encodeURIComponent(detected_subcategory)}"
        
        return {
            "category": detected_category,
            "categoryName": category_name,
            "subcategory": detected_subcategory,
            "keyword": detected_category,  # Keep for backward compatibility
            "workers": workers_data,
            "redirectUrl": redirect_url,
            "userPrompt": user_prompt,
            "enhancedPrompt": enhanced_prompt if enhanced_prompt != user_prompt else None
        }

    except Exception as e:
        print(f"[ERROR] Gemini processing failed: {e}")
        raise e

def encodeURIComponent(text: str) -> str:
    """
    Simple URL encoding function
    """
    import urllib.parse
    return urllib.parse.quote(text)
