from fastapi import APIRouter, HTTPException, status
from database import get_db

router = APIRouter(prefix="/Menu", tags=["Menu"])


# --- 1. Obtener la lista completa de platos para el frontend ---
@router.get("/")
def obtener_menu():
    db = get_db()
    try:
        colecciones = db.list_collection_names()
        print(f"--> [DEBUG /Menu] Colecciones disponibles en Atlas: {colecciones}")

        # 1. Detectar automáticamente la colección adecuada (menu, platos, carta, etc.)
        nombre_col = None
        for c in colecciones:
            if c.lower() in ["menu", "platos", "carta", "menus"]:
                nombre_col = c
                break

        if not nombre_col:
            print("--> [DEBUG /Menu] AVISO: No se detectó coincidencia exacta, intentando con 'menu'")
            nombre_col = "menu"

        # 2. Consultar los documentos en MongoDB
        items = list(db[nombre_col].find())
        print(f"--> [DEBUG /Menu] Documentos encontrados en '{nombre_col}': {len(items)}")

        resultado = []
        for item in items:
            # Compatibilidad con los nombres de campos (Platos, plato, nombre, etc.)
            nombre = (
                item.get("Platos") or
                item.get("Plato") or
                item.get("platos") or
                item.get("plato") or
                item.get("nombre") or
                item.get("Nombre")
            )

            # Si el documento no tiene nombre de plato, lo salta
            if not nombre:
                continue

            descripcion = (
                item.get("Descripcion") or
                item.get("descripcion") or
                item.get("detalle") or
                ""
            )

            precio = (
                item.get("Precio") or
                item.get("precio") or
                item.get("valor") or
                0
            )

            # 3. Formateo seguro a divisa chilena ($8.990)
            try:
                limpio = str(precio).replace("$", "").replace(".", "").replace(",", "").strip()
                precio_num = int(float(limpio))
                precio_str = f"${precio_num:,}".replace(",", ".")
            except Exception:
                precio_str = f"${precio}" if not str(precio).startswith("$") else str(precio)

            resultado.append({
                "nombre": str(nombre).strip(),
                "descripcion": str(descripcion).strip(),
                "precio": precio_str
            })

        print(f"--> [DEBUG /Menu] Enviando {len(resultado)} platos al cliente.")
        return resultado

    except Exception as e:
        print(f"--> [ERROR /Menu] Fallo al consultar: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener el menú desde MongoDB: {str(e)}"
        )