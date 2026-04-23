#!/usr/bin/env python3
"""
ArquitectureWatchdog v3.1 – ignora endpoints do router.py ao listar símbolos não utilizados.
"""

import os
import re
import ast
import hashlib
import threading
from collections import defaultdict, Counter
from itertools import combinations
from tkinter import Tk, filedialog, messagebox, Button, Label, StringVar, Frame, DISABLED, NORMAL

# ================= CONFIG =================
IGNORE_DIRS = {
    "venv", ".venv", "node_modules", "__pycache__", ".git",
    "dist", "build", "data", "logs"
}
IGNORE_FILES = [
    "cópia", "copia", "original", "backup", "old",
    "min.js", "min.css", "jquery", "bootstrap"
]
EXTENSIONS = {".py", ".js", ".html", ".css"}

MAX_SELECTORS_PER_FILE = 80
MIN_CO_OCCURRENCE = 3
MIN_CO_OCCURRENCE_DOMAIN = 2
MIN_COMPONENT_SIZE = 2

FILE_SIZE_WARN = 500
FUNC_SIZE_WARN = 50

STOPWORDS = {
    "the", "and", "for", "with", "from", "this", "that", "var", "let", "const",
    "function", "class", "return", "import", "export", "true", "false", "none",
    "null", "def", "async", "await", "if", "else", "elif", "while", "in", "to",
    "of", "on", "a", "an", "is", "are", "as", "by", "id", "div", "span", "html",
    "css", "js", "py", "btn", "get", "set", "new", "data", "type", "name",
    "document", "getelementbyid", "queryselector", "addeventlistener",
    "classlist", "toggle", "hidden", "show", "container", "wrapper",
    "row", "cell", "header", "footer", "main", "section",
    "px", "rem", "em", "color", "border", "margin", "padding",
    "none", "block", "inline", "flex", "grid", "absolute", "relative",
    "str", "int", "bool", "true", "false", "null",
    "var", "let", "const", "function", "return", "if", "else",
    "for", "while", "do", "switch", "case", "break",
    "async", "await", "import", "export", "default", "from",
    "try", "catch", "finally", "throw", "new", "this", "super",
    "value", "not", "col", "style", "display", "background", "font",
    "json", "text", "nome", "campo", "codigo", "dimensoes",
}

DOMAIN_KEYWORDS = {
    "🧾 Facturação": [
        "fatura", "factura", "vfr", "encomenda", "cliente", "artigo",
        "catalogo", "embalagem", "medida", "stock", "preco", "iva",
    ],
    "📦 Logística": [
        "expedicao", "transporte", "volume", "peso", "dimensoes",
        "palete", "carga", "armazem",
    ],
    "✅ Validação": [
        "validacao", "validar", "alerta", "erro", "inconsistencia",
        "comparador", "conferir",
    ],
    "🔐 Autenticação": [
        "login", "auth", "token", "sessao", "password", "user",
        "permissao", "role", "logout",
    ],
    "🪟 Modais": ["modal", "dialog", "popup", "confirmacao"],
    "📋 Tabelas / Listas": [
        "tabela", "lista", "grid", "paginacao", "sortable",
        "coluna", "ordenar", "filtro", "thead", "tbody",
    ],
    "📝 Formulários": [
        "form", "input", "select", "textarea", "checkbox",
        "radio", "validacao", "campo", "submeter",
    ],
    "🔘 Botões / Acções": [
        "btn", "button", "acao", "acoes", "exportar", "guardar",
        "cancelar", "eliminar", "editar", "duplicar", "copiar",
    ],
    "🧭 Navegação": [
        "navbar", "menu", "sidebar", "breadcrumb", "tab",
        "notebook", "abas", "separador",
    ],
    "📎 Dropdowns / Selectores": [
        "dropdown", "dropdown-btn", "dropdown-content",
        "dropdown-item", "dropdown-menu", "options-dropdown",
        "select2", "multiselect", "autocomplete",
    ],
    "💬 Notificações": ["toast", "notify", "alert", "snackbar", "mensagem"],
    "⚙️ Utilitários": [
        "formatar", "parse", "validar", "calcular", "normalizar",
        "escapehtml", "sanitize", "dicionario",
    ],
    "📡 Comunicações / API": [
        "fetch", "axios", "api", "endpoint", "request", "response",
        "json", "ajax", "carregar", "enviar", "atualizar",
    ],
    "📄 Exportação / Relatórios": [
        "excel", "csv", "pdf", "export", "relatorio", "impressao",
    ],
    "🎨 Temas": [
        "theme", "dark", "light", "cor", "fundo", "variavel", "css",
    ],
}

UTILITY_CLASSES = {
    "btn", "btn-primary", "btn-secondary", "btn-success", "btn-danger",
    "btn-warning", "btn-info", "btn-light", "btn-dark", "btn-link",
    "btn-sm", "btn-lg", "btn-block",
    "fas", "far", "fab", "fa", "fa-file-excel", "fa-chart-line",
    "fa-check-circle", "fa-cog", "fa-edit", "fa-trash-alt", "fa-copy",
    "fa-caret-down", "me-1", "me-2", "ms-2", "mt-2", "mb-2",
    "d-inline-block", "d-flex", "flex-column", "align-items-center",
    "justify-content-between", "justify-content-center",
    "form-control", "form-label", "form-select", "form-check",
    "table", "table-striped", "table-hover", "table-bordered",
    "text-center", "text-start", "text-end", "fw-bold", "fw-normal",
    "bg-white", "bg-light", "bg-dark", "bg-primary",
    "w-100", "h-100", "p-0", "p-2", "p-3", "m-0", "m-2", "m-3",
    "hidden", "show", "active", "disabled", "collapse",
    "row", "col", "col-md-6", "col-lg-4", "container", "container-fluid",
    "navbar", "nav", "nav-item", "nav-link", "dropdown-toggle",
    "card", "card-body", "card-header", "card-footer", "card-title",
}

DOMAIN_INDICATORS = {
    "dropdown", "filtros", "acoes", "modal", "tabela", "formulario",
    "navbar", "sidebar", "breadcrumb", "notificacao", "exportar",
}

# ================= HELPERS =================
def is_ignored(name: str) -> bool:
    n = os.path.splitext(name)[0].lower()
    return any(ig in n for ig in IGNORE_FILES)

def read_file(path: str) -> str:
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()
    except Exception:
        return ""

def normalize_whitespace(text: str) -> str:
    return re.sub(r'\s+', ' ', text.strip())

def is_utility_class(cls):
    if cls in UTILITY_CLASSES:
        return True
    return any(cls.startswith(prefix) for prefix in [
        "fa-", "btn-", "d-", "flex-", "text-", "bg-", "p-", "m-", "w-", "h-"
    ])

# ================= EXTRAÇÃO =================
def extract_python_functions(content: str):
    funcs = set()
    try:
        tree = ast.parse(content)
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                funcs.add(node.name)
    except SyntaxError:
        pass
    return funcs

def extract_js_functions(content: str):
    funcs = set()
    for m in re.finditer(r'(?:async\s+)?function\s+([a-zA-Z_$][\w$]*)', content):
        name = m.group(1)
        if name != "function":
            funcs.add(name)
    funcs.update(re.findall(r'(?:const|let|var)\s+([a-zA-Z_$][\w$]*)\s*=\s*(?:async\s*)?\(', content))
    funcs.update(re.findall(r'(?:\b)([a-zA-Z_$][\w$]*)\s*\(.*\)\s*\{', content))
    return funcs

def extract_selectors(content: str):
    selectors = set()
    for class_attr in re.findall(r'class=["\']([^"\']+)["\']', content):
        for c in class_attr.split():
            if len(c) > 2 and not c[0].isdigit() and not is_utility_class(c):
                selectors.add(c)
    raw = re.findall(r'\.([a-zA-Z0-9_-]{3,})\s*(?:\{|,)', content)
    selectors.update(c for c in raw if not is_utility_class(c))
    raw = re.findall(r'["\']\.([a-zA-Z0-9_-]{3,})["\']', content)
    selectors.update(c for c in raw if not is_utility_class(c))
    return selectors

def extract_jinja_blocks(content: str):
    blocks = defaultdict(list)
    for match in re.finditer(r'{%\s*block\s+(\w+)\s*%}(.*?){%\s*endblock\s*%}', content, re.DOTALL):
        name = match.group(1)
        body = normalize_whitespace(match.group(2))
        blocks[name].append(hashlib.md5(body.encode()).hexdigest())
    return blocks

def extract_keywords(content: str):
    words = re.findall(r"[a-zA-Z_]{3,}", content.lower())
    return [w for w in words if w not in STOPWORDS]

# ================= EVIDÊNCIAS =================
def find_snippet(content: str, pattern: str, item_type: str):
    results = []
    lines = content.split('\n')
    if item_type == 'function_js':
        regex = rf'(?:async\s+)?function\s+{re.escape(pattern)}\b|(?:const|let|var)\s+{re.escape(pattern)}\s*='
        for i, line in enumerate(lines, 1):
            if re.search(regex, line):
                snippet = '\n'.join(lines[i-1:min(i+9, len(lines))])
                results.append((i, snippet))
                break
    elif item_type == 'function_py':
        regex = rf'\bdef\s+{re.escape(pattern)}\s*\('
        for i, line in enumerate(lines, 1):
            if re.search(regex, line):
                snippet = '\n'.join(lines[i-1:min(i+9, len(lines))])
                results.append((i, snippet))
                break
    elif item_type == 'selector_css' or item_type == 'selector_html':
        escaped = re.escape(pattern)
        regex = rf'\.{escaped}\b|class=["\'].*?\b{escaped}\b'
        for i, line in enumerate(lines, 1):
            if re.search(regex, line, re.IGNORECASE):
                results.append((i, line.strip()))
                if len(results) >= 3:
                    break
    elif item_type == 'jinja_block':
        regex = rf'{{%\s*block\s+{re.escape(pattern)}\s*%}}'
        for i, line in enumerate(lines, 1):
            if re.search(regex, line):
                snippet = '\n'.join(lines[i-1:min(i+4, len(lines))])
                results.append((i, snippet))
                break
    return results

def count_function_lines(content, func_name, ext):
    lines = content.split('\n')
    if ext == '.py':
        regex = rf'\bdef\s+{re.escape(func_name)}\s*\('
    else:
        regex = rf'(?:async\s+)?function\s+{re.escape(func_name)}\b|(?:const|let|var)\s+{re.escape(func_name)}\s*='
    for i, line in enumerate(lines):
        if re.search(regex, line):
            j = i + 1
            while j < len(lines) and (lines[j].startswith(' ') or lines[j].startswith('\t') or lines[j].strip() == ''):
                j += 1
            return j - i
    return 0

def get_naming_convention(name):
    if re.match(r'^[a-z][a-z0-9]*(-[a-z0-9]+)*$', name):
        return 'kebab-case'
    if re.match(r'^_?[a-z][a-z0-9]*(_[a-z0-9]+)*$', name):
        return 'snake_case'
    if re.match(r'^[a-z][a-zA-Z0-9]*$', name):
        return 'camelCase'
    if re.match(r'^[A-Z][a-zA-Z0-9]*$', name):
        return 'PascalCase'
    return 'outro'

# ================= DEPENDÊNCIAS =================
def extract_dependencies(content, ext):
    deps = set()
    if ext == '.py':
        deps.update(re.findall(r'^import\s+(\S+)', content, re.MULTILINE))
        deps.update(re.findall(r'^from\s+(\S+)\s+import', content, re.MULTILINE))
    elif ext == '.html':
        deps.update(re.findall(r"{%\s*include\s+['\"](.+?)['\"]", content))
        deps.update(re.findall(r"{%\s*extends\s+['\"](.+?)['\"]", content))
        deps.update(re.findall(r'<script\s+src=["\'](.+?)["\']', content))
        deps.update(re.findall(r'<link\s+[^>]*href=["\'](.+?)["\']', content))
    elif ext == '.css':
        deps.update(re.findall(r"@import\s+url\(['\"]?(.+?)['\"]?\)", content))
    elif ext == '.js':
        deps.update(re.findall(r"import\s+.*?\s+from\s+['\"](.+?)['\"]", content))
    return deps

# ================= MOTOR =================
class ArchitectureWatchdog:
    def __init__(self, root):
        self.root = root
        self.files = []
        self.file_info = {}
        self.file_contents = {}
        self.selector_map = defaultdict(set)
        self.function_map = defaultdict(set)
        self.global_keyword_counter = Counter()
        self.dependency_graph = defaultdict(set)
        self.reverse_deps = defaultdict(set)

    def scan(self):
        for dirpath, dirnames, filenames in os.walk(self.root):
            dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS]
            for fname in filenames:
                if is_ignored(fname):
                    continue
                ext = os.path.splitext(fname)[1].lower()
                if ext in EXTENSIONS:
                    self.files.append(os.path.join(dirpath, fname))

    def _classify_domain(self, tokens):
        scores = defaultdict(int)
        for token in tokens:
            tok = token.lower()
            for domain, keywords in DOMAIN_KEYWORDS.items():
                if any(key in tok for key in keywords):
                    scores[domain] += 1
        return max(scores, key=scores.get) if scores else "📦 genérico"

    def analyze(self):
        for filepath in self.files:
            content = read_file(filepath)
            self.file_contents[filepath] = content
            ext = os.path.splitext(filepath)[1].lower()

            selectors = extract_selectors(content)
            functions = set()
            blocks = {}

            if ext == ".py":
                functions = extract_python_functions(content)
            elif ext == ".js":
                functions = extract_js_functions(content)
            elif ext == ".html":
                blocks = extract_jinja_blocks(content)

            domain_fixo = self._classify_domain(list(selectors) + list(functions))
            keywords = extract_keywords(content)
            self.global_keyword_counter.update(keywords)

            line_count = content.count('\n') + 1
            func_sizes = {}
            for fn in functions:
                size = count_function_lines(content, fn, ext)
                if size > 0:
                    func_sizes[fn] = size

            self.file_info[filepath] = {
                "selectors": selectors,
                "functions": functions,
                "domain_fixo": domain_fixo,
                "blocks": blocks,
                "keywords": keywords,
                "ext": ext,
                "line_count": line_count,
                "func_sizes": func_sizes,
            }

            for sel in selectors:
                self.selector_map[sel].add(filepath)
            for fn in functions:
                self.function_map[fn].add(filepath)

            deps = extract_dependencies(content, ext)
            resolved = set()
            for dep in deps:
                if ext == '.py':
                    if dep.startswith('.'):
                        resolved.add(dep)
                    else:
                        possible = os.path.join(os.path.dirname(filepath), dep.replace('.', os.sep) + '.py')
                        if os.path.exists(possible):
                            resolved.add(possible)
                else:
                    candidate = os.path.normpath(os.path.join(os.path.dirname(filepath), dep))
                    if os.path.exists(candidate):
                        resolved.add(candidate)
            self.dependency_graph[filepath].update(resolved)
            for r in resolved:
                self.reverse_deps[r].add(filepath)

    def discover_domains(self):
        top_keywords = [w for w, _ in self.global_keyword_counter.most_common(200)]
        domain_map = defaultdict(list)
        for filepath, info in self.file_info.items():
            kws = info["keywords"]
            score = Counter({w: c for w, c in Counter(kws).items() if w in top_keywords})
            if not score:
                info["auto_domain"] = "🟦 domínio_desconhecido"
                domain_map["🟦 domínio_desconhecido"].append(filepath)
                continue
            dominant = score.most_common(1)[0][0]
            info["auto_domain"] = dominant
            domain_map[dominant].append(filepath)
        return domain_map

    def build_selector_clusters(self):
        co_occurrence = defaultdict(int)
        for info in self.file_info.values():
            sels = sorted(info["selectors"])[:MAX_SELECTORS_PER_FILE]
            for a, b in combinations(sels, 2):
                co_occurrence[(a, b)] += 1

        graph = defaultdict(set)
        for (a, b), count in co_occurrence.items():
            is_domain = any(ind in a.lower() or ind in b.lower() for ind in DOMAIN_INDICATORS)
            threshold = MIN_CO_OCCURRENCE_DOMAIN if is_domain else MIN_CO_OCCURRENCE
            if count >= threshold:
                graph[a].add(b)
                graph[b].add(a)

        visited = set()
        components = []
        for node in graph:
            if node in visited:
                continue
            stack = [node]
            group = set()
            while stack:
                n = stack.pop()
                if n in visited:
                    continue
                visited.add(n)
                group.add(n)
                stack.extend(graph[n] - group)
            if len(group) >= MIN_COMPONENT_SIZE:
                components.append(group)
        return components

    def detect_drift(self, components):
        drift_cases = []
        for comp in components:
            files_using_comp = set()
            for sel in comp:
                files_using_comp.update(self.selector_map[sel])
            if len(files_using_comp) > 10:
                continue
            signatures = []
            for f in files_using_comp:
                if f in self.file_info:
                    signatures.append(tuple(sorted(self.file_info[f]["functions"])))
            unique = set(signatures)
            if len(unique) > 1:
                drift_cases.append({
                    "component": comp,
                    "files": files_using_comp,
                    "variations": len(unique),
                })
        return drift_cases

    def detect_js_template_duplicates(self):
        candidates = defaultdict(list)
        for filepath, info in self.file_info.items():
            if info["ext"] != ".js":
                continue
            content = self.file_contents[filepath]
            matches = re.findall(r'`([^`]{100,}?)`', content, re.DOTALL)
            for m in matches:
                if re.search(r'<\w+', m):
                    h = hashlib.md5(normalize_whitespace(m).encode()).hexdigest()
                    candidates[h].append((filepath, m[:150]))
        duplicates = []
        for h, occurrences in candidates.items():
            if len(occurrences) > 1:
                duplicates.append({
                    "hash": h,
                    "files": [o[0] for o in occurrences],
                    "sample": occurrences[0][1],
                })
        return duplicates

    def get_component_suggestion(self, comp_classes):
        best_domain = None
        max_hits = 0
        for domain, keywords in DOMAIN_KEYWORDS.items():
            hits = sum(1 for c in comp_classes if any(k in c.lower() for k in keywords))
            if hits > max_hits:
                max_hits = hits
                best_domain = domain

        suggestions = {
            "📎 Dropdowns / Selectores": "Unificar classes CSS e lógica JS do dropdown num componente reutilizável (ex: macro Jinja + módulo JS).",
            "📄 Exportação / Relatórios": "Centralizar funções de exportação (Excel, CSV, etc.) em 'utils.js' ou 'api.js'.",
            "⚙️ Utilitários": "Mover funções utilitárias duplicadas para 'utils.js'.",
            "📡 Comunicações / API": "Evitar chamadas fetch/axios dispersas; criar um serviço 'api.js'.",
            "🔘 Botões / Acções": "Padronizar botões de ação com uma macro Jinja 'button.html'.",
            "📝 Formulários": "Criar componentes reutilizáveis para campos de formulário ('form_field.html').",
            "📋 Tabelas / Listas": "Unificar lógica de tabelas/listas num único script 'list_common.js'.",
            "🪟 Modais": "Usar um único componente modal (ex: 'modal.html' + 'modal.js').",
        }
        return suggestions.get(best_domain, "Avaliar se as classes podem ser abstraídas num componente reutilizável.")

    def build_report(self):
        self.scan()
        self.analyze()
        auto_domains = self.discover_domains()
        components = self.build_selector_clusters()
        drift_cases = self.detect_drift(components)
        problems = self.detect_problems()
        js_templates = self.detect_js_template_duplicates()

        lines = []
        lines.append("🧠 ARQUITECTURE INTELLIGENCE REPORT v3.1")
        lines.append("=" * 60)
        lines.append(f"📁 Projeto: {self.root}")
        lines.append(f"📄 Ficheiros analisados: {len(self.files)}")
        lines.append("")

        # 1. Domínios automáticos
        lines.append("🌐 DOMÍNIOS SUGERIDOS AUTOMATICAMENTE")
        for domain, files in sorted(auto_domains.items(), key=lambda x: -len(x[1])):
            if len(files) <= 1:
                continue
            lines.append(f"➡ {domain} ({len(files)} ficheiros)")
            for f in files[:3]:
                lines.append(f"   - {os.path.relpath(f, self.root)}")
            if len(files) > 3:
                lines.append(f"   ... e mais {len(files)-3}.")
            lines.append("")

        lines.append("🏷️ PALAVRAS MAIS FREQUENTES")
        for w, c in self.global_keyword_counter.most_common(25):
            lines.append(f"   {w}: {c}")
        lines.append("")

        domain_fixo_map = defaultdict(list)
        for f, info in self.file_info.items():
            domain_fixo_map[info["domain_fixo"]].append(f)
        lines.append("🏗️ ESTRUTURA POR DOMÍNIOS FIXOS")
        for dom, f_list in sorted(domain_fixo_map.items(), key=lambda x: -len(x[1])):
            lines.append(f"  {dom}: {len(f_list)} ficheiros")
        lines.append("")

        # 5. Mapa de dependências
        lines.append("🗺️ MAPA DE DEPENDÊNCIAS")
        centrality = sorted(self.reverse_deps.items(), key=lambda x: -len(x[1]))[:10]
        if centrality:
            lines.append("📌 Ficheiros mais dependidos (centrais):")
            for f, dependentes in centrality:
                rel = os.path.relpath(f, self.root)
                lines.append(f"   {rel} → dependido por {len(dependentes)} ficheiros")
        lines.append("")

        # 6. Símbolos potencialmente não utilizados (com filtro de router.py)
        lines.append("🕵️ SÍMBOLOS POTENCIALMENTE NÃO UTILIZADOS")
        unused_found = False
        for fn, files in self.function_map.items():
            if len(files) == 1:
                f = list(files)[0]
                # ignora funções de router.py que não começam por _ (endpoints)
                if os.path.basename(f) == 'router.py' and not fn.startswith('_'):
                    continue
                # verifica se é chamada noutro ficheiro
                called_elsewhere = False
                for other_f, content in self.file_contents.items():
                    if other_f == f:
                        continue
                    if re.search(r'\b' + re.escape(fn) + r'\s*\(', content):
                        called_elsewhere = True
                        break
                if not called_elsewhere and fn not in STOPWORDS:
                    unused_found = True
                    lines.append(f"   🔹 Função '{fn}' definida apenas em {os.path.relpath(f, self.root)} e não parece ser usada fora dele.")
        # Classes CSS não utilizadas
        css_files = [fp for fp, info in self.file_info.items() if info['ext'] == '.css']
        for css_f in css_files:
            css_content = self.file_contents.get(css_f, '')
            defined_classes = set(re.findall(r'\.([a-zA-Z0-9_-]+)\s*\{', css_content))
            used_anywhere = set(self.selector_map.keys())
            for cls in defined_classes:
                if cls not in used_anywhere and not is_utility_class(cls):
                    unused_found = True
                    lines.append(f"   🎨 Classe '{cls}' definida em CSS mas nunca usada nos ficheiros analisados.")
        if not unused_found:
            lines.append("   Nenhum símbolo não utilizado detetado.")
        lines.append("")

        # 7. Métricas de tamanho
        lines.append("📏 MÉTRICAS DE TAMANHO")
        large_files = [(fp, info['line_count']) for fp, info in self.file_info.items() if info['line_count'] > FILE_SIZE_WARN]
        large_funcs = []
        for fp, info in self.file_info.items():
            for fn, size in info.get('func_sizes', {}).items():
                if size > FUNC_SIZE_WARN:
                    large_funcs.append((fp, fn, size))
        if large_files:
            lines.append(f"⚠️ Ficheiros com mais de {FILE_SIZE_WARN} linhas:")
            for fp, lines_count in large_files:
                lines.append(f"   {os.path.relpath(fp, self.root)} ({lines_count} linhas)")
        else:
            lines.append("✅ Nenhum ficheiro excede 500 linhas.")
        if large_funcs:
            lines.append(f"⚠️ Funções com mais de {FUNC_SIZE_WARN} linhas:")
            for fp, fn, size in large_funcs[:10]:
                lines.append(f"   {fn}() em {os.path.relpath(fp, self.root)} ({size} linhas)")
        else:
            lines.append("✅ Nenhuma função excede 50 linhas.")
        lines.append("")

        # 8. Consistência de nomenclatura
        lines.append("🏷️ CONSISTÊNCIA DE NOMENCLATURA")
        naming_stats = Counter()
        outliers = []
        for f in self.files:
            name = os.path.splitext(os.path.basename(f))[0]
            naming_stats[get_naming_convention(name)] += 1
            if get_naming_convention(name) not in ('kebab-case', 'snake_case'):
                outliers.append(("ficheiro", name, f))
        for fn in self.function_map:
            conv = get_naming_convention(fn)
            naming_stats[conv] += 1
            if conv not in ('snake_case', 'camelCase'):
                outliers.append(("função", fn, list(self.function_map[fn])[0]))
        if outliers:
            lines.append("🔸 Nomes fora dos convencionais (kebab-case, snake_case, camelCase):")
            for tipo, nome, local in outliers[:15]:
                rel = os.path.relpath(local, self.root) if isinstance(local, str) else local
                lines.append(f"   {tipo} '{nome}' em {rel}")
        else:
            lines.append("✅ Nomenclatura consistente.")
        lines.append("")

        # 9. Componentes implícitos
        lines.append("🧩 COMPONENTES IMPLÍCITOS (com sugestões)")
        for comp in sorted(components, key=lambda x: -len(x))[:12]:
            f_set = set()
            for sel in comp:
                f_set.update(self.selector_map[sel])
            relevant = [c for c in comp if not is_utility_class(c)][:5]
            if not relevant:
                continue
            suggestion = self.get_component_suggestion(comp)
            comp_domain = self._classify_domain(list(comp))
            lines.append(f"➡ {comp_domain} Cluster: {', '.join(relevant)} ...")
            lines.append(f"   Seletores: {len(comp)} | Ficheiros: {len(f_set)}")
            lines.append(f"   Sugestão: {suggestion}")
            exemplo = next(iter(f_set)) if f_set else "?"
            lines.append(f"   Ex: {os.path.relpath(exemplo, self.root)}")
            lines.append("")

        # 10. Deriva
        lines.append("⚠️ DERIVA DETETADA")
        for d in drift_cases[:10]:
            nomes = sorted(d["component"])[:4]
            lines.append(f"➡ {', '.join(nomes)}... ({len(d['files'])} ficheiros, {d['variations']} variações)")
        lines.append("")

        # 11. Templates JS duplicados
        if js_templates:
            lines.append("📄 TEMPLATES HTML DUPLICADOS DENTRO DE JS")
            for t in js_templates[:10]:
                lines.append(f"➡ Template duplicado em {len(t['files'])} ficheiros:")
                for f in t['files']:
                    lines.append(f"   - {os.path.relpath(f, self.root)}")
                lines.append(f"   Amostra: {t['sample'][:200]}")
                lines.append("   Sugestão: Extrair para uma função 'render...()' em 'utils.js'.")
                lines.append("")

        # 12. Problemas concretos
        lines.append("❌ PROBLEMAS DETETADOS")
        if not problems:
            lines.append("Nenhum problema grave encontrado.")
        for p in problems:
            if p["type"] == "duplicated_function":
                lines.append(f"🔁 Função duplicada: {p['name']} em {len(p['files'])} ficheiros")
                lines.append(f"   Sugestão: {p['suggestion']}")
                for ev in p.get("evidence", []):
                    lines.append(f"   📍 {os.path.relpath(ev['file'], self.root)} (linha {ev['line']})")
                    snippet = ev['snippet'].replace('\n', '\n   | ')
                    lines.append(f"   | {snippet}")
            elif p["type"] == "jinja_duplicate_block":
                lines.append(f"📄 Bloco Jinja idêntico: '{p['block']}' em {len(p['files'])} templates")
                lines.append(f"   Sugestão: {p['suggestion']}")
                for ev in p.get("evidence", []):
                    lines.append(f"   📍 {os.path.relpath(ev['file'], self.root)} (linha {ev['line']})")
                    snippet = ev['snippet'].replace('\n', '\n   | ')
                    lines.append(f"   | {snippet}")
            elif p["type"] == "overused_selector":
                lines.append(f"🎨 Selector usado em excesso: .{p['selector']} ({len(p['files'])} ficheiros)")
                lines.append(f"   Sugestão: {p['suggestion']}")
                for ev in p.get("evidence", []):
                    lines.append(f"   📍 {os.path.relpath(ev['file'], self.root)} (linha {ev['line']})")
                    lines.append(f"   | {ev['snippet']}")
            lines.append("")

        lines.append("📊 FIM DO RELATÓRIO")
        return "\n".join(lines)

    def detect_problems(self):
        problems = []
        for fn, files in self.function_map.items():
            if fn == "function":
                continue
            if len(files) > 1 and not any("list_common" in f for f in files):
                evidence = []
                for fp in list(files)[:3]:
                    content = self.file_contents.get(fp, "")
                    ext = os.path.splitext(fp)[1].lower()
                    item_type = 'function_py' if ext == '.py' else 'function_js'
                    snippets = find_snippet(content, fn, item_type)
                    for line, snippet in snippets[:1]:
                        evidence.append({"file": fp, "line": line, "snippet": snippet})
                problems.append({
                    "type": "duplicated_function",
                    "name": fn,
                    "files": list(files),
                    "suggestion": f"Extrair '{fn}' para um módulo comum (ex: utils.js ou mixin).",
                    "evidence": evidence,
                })

        block_hashes = defaultdict(set)
        for filepath, info in self.file_info.items():
            for block_name, hashes in info.get("blocks", {}).items():
                for h in hashes:
                    block_hashes[(block_name, h)].add(filepath)

        for (block_name, hash_val), files in block_hashes.items():
            if len(files) > 1:
                evidence = []
                for fp in list(files)[:3]:
                    content = self.file_contents.get(fp, "")
                    snippets = find_snippet(content, block_name, 'jinja_block')
                    for line, snippet in snippets[:1]:
                        evidence.append({"file": fp, "line": line, "snippet": snippet})
                problems.append({
                    "type": "jinja_duplicate_block",
                    "block": block_name,
                    "files": list(files),
                    "suggestion": f"Bloco '{block_name}' idêntico em {len(files)} templates. Avalia se justifica um include ou macro.",
                    "evidence": evidence,
                })

        for sel, files in self.selector_map.items():
            if len(files) > 8 and not is_utility_class(sel):
                evidence = []
                for fp in list(files)[:3]:
                    content = self.file_contents.get(fp, "")
                    snippets = find_snippet(content, sel, 'selector_css')
                    for line, snippet in snippets[:2]:
                        evidence.append({"file": fp, "line": line, "snippet": snippet})
                problems.append({
                    "type": "overused_selector",
                    "selector": sel,
                    "files": list(files),
                    "suggestion": f"Selector '{sel}' aparece em {len(files)} ficheiros. Confirma se está centralizado no CSS.",
                    "evidence": evidence,
                })

        return problems

# ================= GUI =================
class App:
    def __init__(self):
        self.root = Tk()
        self.root.title("Architecture Watchdog v3.1")
        self.root.geometry("450x210")
        self.root.resizable(False, False)

        self.folder_path = StringVar()

        frame = Frame(self.root, padx=10, pady=10)
        frame.pack(expand=True, fill="both")

        Label(frame, text="Pasta do projeto:").grid(row=0, column=0, sticky="w")
        Label(frame, textvariable=self.folder_path, fg="blue", wraplength=300).grid(row=0, column=1, sticky="w")

        Button(frame, text="Selecionar Pasta", command=self.browse).grid(row=1, column=1, pady=5, sticky="w")

        self.run_btn = Button(frame, text="Analisar Arquitetura", command=self.start_analysis, state=DISABLED)
        self.run_btn.grid(row=2, column=1, pady=5, sticky="w")

        self.status = StringVar(value="")
        Label(frame, textvariable=self.status, fg="green").grid(row=3, columnspan=2, pady=10)

    def browse(self):
        path = filedialog.askdirectory(title="Selecionar pasta raiz do projeto")
        if path:
            self.folder_path.set(path)
            self.run_btn.config(state=NORMAL)
            self.status.set("Pasta selecionada. Clique em 'Analisar'.")

    def start_analysis(self):
        path = self.folder_path.get()
        if not os.path.isdir(path):
            messagebox.showerror("Erro", "Caminho inválido.")
            return

        self.run_btn.config(state=DISABLED)
        self.status.set("A analisar... aguarda um momento.")

        def task():
            try:
                wd = ArchitectureWatchdog(path)
                report = wd.build_report()

                report_file = os.path.join(path, "architecture_report.txt")
                with open(report_file, "w", encoding="utf-8") as f:
                    f.write(report)

                self.root.after(0, lambda: self.on_finish(True, report_file))
            except Exception as e:
                self.root.after(0, lambda: self.on_finish(False, str(e)))

        threading.Thread(target=task, daemon=True).start()

    def on_finish(self, success, info):
        self.run_btn.config(state=NORMAL)
        if success:
            self.status.set(f"Relatório guardado em:\n{info}")
            messagebox.showinfo("Concluído", f"Análise terminada.\nRelatório: {info}")
        else:
            self.status.set("Erro durante a análise.")
            messagebox.showerror("Erro", f"Falha na análise:\n{info}")

    def run(self):
        self.root.mainloop()

if __name__ == "__main__":
    app = App()
    app.run()