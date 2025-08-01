# backend/main.py

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
import os
import json

# ---------------------------------------------------------
# 1. Configuração da Aplicação FastAPI
# ---------------------------------------------------------
app = FastAPI(
    title="LogiGest API",
    description="API para cálculo de custos logísticos e gestão de transportadores e tabelas de preços.",
    version="0.1.0"
)

# ---------------------------------------------------------
# 2. Configuração do CORS (para permitir que o frontend aceda)
# ---------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permite que qualquer origem aceda à API (bom para desenvolvimento)
    allow_credentials=True,
    allow_methods=["*"],  # Permite todos os métodos (GET, POST, PUT, DELETE)
    allow_headers=["*"],  # Permite todos os cabeçalhos
)

# ---------------------------------------------------------
# 3. Servir Ficheiros Estáticos (HTML, CSS, JS do Frontend)
# ---------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
PRICE_TABLES_DATA_DIR = os.path.join(DATA_DIR, "price_tables")

# Cria as pastas 'data' e 'data/price_tables' se não existirem
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(PRICE_TABLES_DATA_DIR, exist_ok=True)

app.mount(
    "/public",
    StaticFiles(directory=os.path.join(BASE_DIR, "frontend-public")),
    name="frontend_public"
)

app.mount(
    "/admin",
    StaticFiles(directory=os.path.join(BASE_DIR, "frontend-admin")),
    name="frontend_admin"
)

# ---------------------------------------------------------
# 4. Rota Raiz (Página Inicial)
# ---------------------------------------------------------
@app.get("/", response_class=HTMLResponse)
async def read_root():
    with open(os.path.join(BASE_DIR, "frontend-public", "index.html"), "r", encoding="utf-8") as f:
        return f.read()

# ---------------------------------------------------------
# 5. Funções Auxiliares para Leitura/Escrita de JSON
# ---------------------------------------------------------

def read_json_file(file_path: str, default_data: any = None):
    """Lê um ficheiro JSON. Retorna default_data se o ficheiro não existir ou estiver vazio/inválido."""
    if not os.path.exists(file_path) or os.path.getsize(file_path) == 0:
        return default_data if default_data is not None else []
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        print(f"Erro ao analisar JSON em {file_path}: {e}")
        return default_data if default_data is not None else []
    except Exception as e:
        print(f"Erro ao ler ficheiro {file_path}: {e}")
        return default_data if default_data is not None else []

def write_json_file(file_path: str, data: any):
    """Escreve dados para um ficheiro JSON."""
    try:
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Erro ao escrever para o ficheiro {file_path}: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao guardar dados: {e}")

# ---------------------------------------------------------
# 6. Rotas da API para Transportadores (Mantido como está)
# ---------------------------------------------------------
CARRIERS_FILE = os.path.join(DATA_DIR, "carriers.json")

initial_carriers_data = read_json_file(CARRIERS_FILE, default_data=[])
mock_carriers = initial_carriers_data if isinstance(initial_carriers_data, list) else []

@app.get("/api/carriers")
async def get_carriers():
    """Retorna uma lista de transportadores."""
    return mock_carriers

@app.post("/api/carriers")
async def save_carriers(carriers: list[dict]):
    """Recebe e salva a lista completa de transportadores no ficheiro JSON."""
    global mock_carriers
    mock_carriers = carriers
    write_json_file(CARRIERS_FILE, mock_carriers)
    return {"message": "Transportadores salvos com sucesso.", "count": len(mock_carriers)}

# ---------------------------------------------------------
# 7. Rotas da API para Tabelas de Preços (NOVA ESTRUTURA)
# ---------------------------------------------------------
PRICE_TABLES_INDEX_FILE = os.path.join(DATA_DIR, "price_tables_index.json")

# Carregar o índice de tabelas de preços ao iniciar a aplicação
initial_price_tables_index_data = read_json_file(PRICE_TABLES_INDEX_FILE, default_data=[])
price_tables_index = initial_price_tables_index_data if isinstance(initial_price_tables_index_data, list) else []

@app.get("/api/price-tables/index")
async def get_price_tables_index():
    """Retorna o índice (metadados) de todas as tabelas de preços."""
    return price_tables_index

@app.get("/api/price-tables/{table_id}")
async def get_price_table_by_id(table_id: str):
    """Retorna uma tabela de preços específica pelo seu ID."""
    table_meta = next((t for t in price_tables_index if t["id"] == table_id), None)
    if not table_meta:
        raise HTTPException(status_code=404, detail="Tabela de preços não encontrada.")
    
    file_path = os.path.join(PRICE_TABLES_DATA_DIR, table_meta["filename"])
    table_data = read_json_file(file_path, default_data={})
    
    if not table_data:
        # Se o ficheiro individual estiver vazio ou inválido, mas o índice o referencia
        raise HTTPException(status_code=404, detail=f"Dados da tabela '{table_id}' não encontrados ou inválidos.")
    
    return table_data

@app.post("/api/price-tables/{table_id}")
async def save_price_table(table_id: str, table_data: dict):
    """Salva uma tabela de preços específica no seu ficheiro JSON individual."""
    # Encontra a entrada no índice ou cria uma nova
    table_meta = next((t for t in price_tables_index if t["id"] == table_id), None)
    
    if not table_meta:
        # Se for uma nova tabela, adiciona ao índice
        new_filename = f"{table_id}.json" # Usa o ID como base para o nome do ficheiro
        table_meta = {
            "id": table_id,
            "name": table_data.get("name", "Tabela Sem Nome"),
            "type": table_data.get("type", "Desconhecido"),
            "carrierName": table_data.get("carrierName", "N/A"),
            "carrierId": table_data.get("carrierId", "N/A"),
            "filename": new_filename
        }
        price_tables_index.append(table_meta)
        write_json_file(PRICE_TABLES_INDEX_FILE, price_tables_index) # Atualiza o índice
    else:
        # Atualiza metadados no índice para uma tabela existente
        table_meta["name"] = table_data.get("name", table_meta.get("name"))
        table_meta["type"] = table_data.get("type", table_meta.get("type"))
        table_meta["carrierName"] = table_data.get("carrierName", table_meta.get("carrierName"))
        table_meta["carrierId"] = table_data.get("carrierId", table_meta.get("carrierId"))
        write_json_file(PRICE_TABLES_INDEX_FILE, price_tables_index) # Atualiza o índice
        
    file_path = os.path.join(PRICE_TABLES_DATA_DIR, table_meta["filename"])
    write_json_file(file_path, table_data) # Escreve os dados completos da tabela
    
    return {"message": f"Tabela de preços '{table_id}' salva com sucesso."}

@app.delete("/api/price-tables/{table_id}")
async def delete_price_table(table_id: str):
    """Elimina uma tabela de preços e a sua entrada no índice."""
    global price_tables_index
    
    table_meta = next((t for t in price_tables_index if t["id"] == table_id), None)
    if not table_meta:
        raise HTTPException(status_code=404, detail="Tabela de preços não encontrada no índice.")
    
    # Remove do índice
    price_tables_index = [t for t in price_tables_index if t["id"] != table_id]
    write_json_file(PRICE_TABLES_INDEX_FILE, price_tables_index)
    
    # Tenta apagar o ficheiro individual
    file_path = os.path.join(PRICE_TABLES_DATA_DIR, table_meta["filename"])
    if os.path.exists(file_path):
        os.remove(file_path)
    
    return {"message": f"Tabela de preços '{table_id}' e seu ficheiro foram eliminados com sucesso."}


# ---------------------------------------------------------
# 8. Rotas da API para Países (Mantido como está)
# ---------------------------------------------------------
COUNTRIES_FILE = os.path.join(DATA_DIR, "countries.json")

@app.get("/api/countries")
async def get_countries():
    """Retorna uma lista de países lida do ficheiro data/countries.json."""
    countries_data = read_json_file(COUNTRIES_FILE, default_data=[])
    if not countries_data:
        print(f"Aviso: O ficheiro {COUNTRIES_FILE} está vazio ou não pôde ser lido. Retornando lista de países vazia.")
    return countries_data

