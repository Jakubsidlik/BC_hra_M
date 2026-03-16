import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Any, Tuple
import sympy
from sympy import (
    symbols, simplify, Abs, Mod, pi, E, 
    Integral, Derivative, Limit, Sum, 
    sin, cos, tan, log, sqrt, sstr
)
from sympy.parsing.sympy_parser import (
    parse_expr, 
    standard_transformations, 
    implicit_multiplication_application,
    convert_xor
)
import random
import concurrent.futures
import uvicorn
from collections import OrderedDict

app = FastAPI(title="Teorie Křídy - Matematický Engine v2.1")

# Povolení komunikace z Vercelu (Frontendu)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Nastavení transformací pro parser (automatické násobení + převod ^ na mocninu)
MATH_TRANSFORMATIONS = standard_transformations + (
    implicit_multiplication_application,
    convert_xor
)

# LRU cache for Q.E.D. results (skip for randomized modifiers)
QED_CACHE_MAX = 512
_qed_cache: "OrderedDict[str, dict]" = OrderedDict()

class ExpressionRequest(BaseModel):
    expression: str
    target_r: str 
    modifiers: List[str] = []

def pre_clean_string(expr: str) -> str:
    """Základní sjednocení symbolů před samotným parsováním."""
    if not expr or expr.strip() == "": return "0"
    
    # Sjednocení českých/nestandardních zápisů na SymPy standard
    replacements = {
        'π': 'pi',
        'e': 'E',
        ':': '/',
        'tg': 'tan',
        'cotg': '1/tan',  
        'ln': 'log',      
        'lim': 'Limit',   
        'sum': 'Sum'
        # Nekonečno odstraněno
    }
    
    for old, new in replacements.items():
        expr = expr.replace(old, new)
    
    return expr

def normalize_expression_string(expr: str) -> str:
    """Lehká normalizace vstupu pro stabilní cache klíče."""
    expr = pre_clean_string(expr)
    expr = "".join(expr.split())
    for _ in range(4):
        expr = expr.replace("++", "+").replace("--", "+").replace("+-", "-").replace("-+", "-")
    return expr

def pre_normalize_expr(expr: Any) -> Any:
    """Lehké zjednodušení před finální kontrolou rovnosti."""
    try:
        expr = sympy.together(expr)
        expr = sympy.cancel(expr)
    except Exception:
        return expr
    return expr

def _get_cache_key(raw_l: str, raw_r: str, modifiers: List[str]) -> str:
    norm_l = normalize_expression_string(raw_l)
    norm_r = normalize_expression_string(raw_r)
    mod_key = ",".join(sorted(modifiers))
    return f"{norm_l}||{norm_r}||{mod_key}"

def _cache_get(key: str) -> Any:
    value = _qed_cache.get(key)
    if value is None:
        return None
    _qed_cache.move_to_end(key)
    return value

def _cache_set(key: str, value: dict) -> None:
    _qed_cache[key] = value
    _qed_cache.move_to_end(key)
    if len(_qed_cache) > QED_CACHE_MAX:
        _qed_cache.popitem(last=False)

def safe_evaluate(raw_l: str, raw_r: str, modifiers: List[str]):
    """Symbolický výpočet identity L = R pomocí nativního parseru."""
    
    # ROZŠÍŘENÝ SLOVNÍK (bez nekonečna)
    local_dict = {
        'x': symbols('x'), 
        'y': symbols('y'), 
        'n': symbols('n'),
        'Integral': Integral, 
        'Derivative': Derivative,
        'Limit': Limit, 
        'Sum': Sum,
        'sin': sin, 
        'cos': cos, 
        'tan': tan,
        'log': log, 
        'sqrt': sqrt
    }
    
    try:
        # Parsování; .doit() jen když je potřeba (zrychlení běžných výrazů)
        L: Any = parse_expr(pre_clean_string(raw_l), local_dict=local_dict, transformations=MATH_TRANSFORMATIONS)
        R: Any = parse_expr(pre_clean_string(raw_r), local_dict=local_dict, transformations=MATH_TRANSFORMATIONS)
    except Exception as e:
        raise ValueError(f"Chyba syntaxe. Nechybí ti někde závorka? (Detail: {str(e)})")

    if any(func in str(L) for func in ("Integral", "Sum", "Limit", "Derivative")):
        L = L.doit()
    if any(func in str(R) for func in ("Integral", "Sum", "Limit", "Derivative")):
        R = R.doit()

    special_msg = ""
    
    # --- APLIKACE HERNÍCH MODIFIKÁTORŮ ---
    if "ABS_VALUE" in modifiers:
        L = Abs(L)
        special_msg += " Aplikována absolutní hodnota. "

    if "NEW_R" in modifiers:
        new_val = random.randint(2, 50)
        R = sympy.Integer(new_val)
        special_msg += f"Karta změnila výsledek! Nový cíl R je {new_val}. "
        
    if "MOD_R" in modifiers:
        R = Mod(R, 10)
        special_msg += " Modulo zredukovalo cíl! "
        
    if "PI_R" in modifiers:
        R = R * pi
        special_msg += " Do rovnice vstoupilo π! "

    # --- LEHKÁ NORMALIZACE PŘED Q.E.D. ---
    L = pre_normalize_expr(L)
    R = pre_normalize_expr(R)

    # --- KONTROLA SHODY (Q.E.D.) ---
    try:
        diff = simplify(L - R)
        is_match = (diff == 0) or (getattr(diff, 'is_number', False) and abs(diff.evalf()) < 1e-12)
    except Exception:
        is_match = False

    return {
        "is_match": bool(is_match),
        "simplified_l": sstr(L).replace('**', '^'),
        "current_r": sstr(R).replace('**', '^'),
        "message": special_msg.strip()
    }

@app.post("/evaluate")
async def evaluate_expression(data: ExpressionRequest):
    try:
        use_cache = "NEW_R" not in data.modifiers
        cache_key = _get_cache_key(data.expression, data.target_r, data.modifiers) if use_cache else ""
        if use_cache:
            cached = _cache_get(cache_key)
            if cached is not None:
                return {
                    "success": True,
                    "is_match": cached["is_match"],
                    "simplified": cached["simplified_l"],
                    "new_r": cached["current_r"],
                    "message": cached["message"]
                }
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(safe_evaluate, data.expression, data.target_r, data.modifiers)
            try:
                result = future.result()
            except ZeroDivisionError:
                return {"success": False, "error": "Matematický error: Dělení nulou!"}
            except ValueError as ve:
                return {"success": False, "error": str(ve)}

        if use_cache:
            _cache_set(cache_key, result)

        return {
            "success": True,
            "is_match": result["is_match"],
            "simplified": result["simplified_l"],
            "new_r": result["current_r"],
            "message": result["message"]
        }
        
    except Exception as e:
        return {"success": False, "error": f"Fatální chyba enginu: {str(e)}"}

@app.get("/")
def health_check():
    return {"status": "online", "engine": "SymPy Parser v2.1 (VŠ Ready, bez nekonečna)"}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)