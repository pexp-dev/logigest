#!/usr/bin/env python3
"""
AutoDevGuide vFinal – Gera DEVGUIDE.md exaustivo e automático.
Deteta todos os templates base, scripts principais, componentes e muito mais.
"""

import os
import re
import ast
from collections import defaultdict, Counter
from tkinter import Tk, filedialog, messagebox, Label, StringVar, Button, Frame

# ================= CONFIG =================
IGNORE_DIRS = {"venv", ".venv", "node_modules", "__pycache__", ".git", "dist", "build", "data", "logs"}
IGNORE_FILES = ["cópia", "copia", "original", "backup", "old", "min.js", "min.css", "jquery", "bootstrap"]
EXTENSIONS = {".py", ".js", ".html", ".css"}

JS_KEYWORDS = {
    "if", "else", "for", "while", "do", "switch", "case", "break", "continue",
    "return", "function", "const", "let", "var", "class", "extends", "super",
    "import", "export", "default", "this", "new", "delete", "typeof", "instanceof",
    "void", "try", "catch", "finally", "throw", "async", "await",
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

# ================= HELPERS =================
def is_ignored(name):
    n = os.path.splitext(name)[0].lower()
    return any(ig in n for ig in IGNORE_FILES)

def read_file(path):
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()
    except:
        return ""

def is_utility_class(cls):
    if cls in UTILITY_CLASSES:
        return True
    return any(cls.startswith(prefix) for prefix in ["fa-", "btn-", "d-", "flex-", "text-", "bg-", "p-", "m-", "w-", "h-"])

def rel_forward(filepath, root):
    rel = os.path.relpath(filepath, root)
    return rel.replace(os.sep, '/')

def module_docstring(content):
    stripped = content.lstrip()
    match = re.match(r'(?:"""(.*?)"""|\'\'\'(.*?)\'\'\'|"(.*?)"|\'(.*?)\')', stripped, re.DOTALL)
    if match:
        doc = match.group(1) or match.group(2) or match.group(3) or match.group(4)
        return doc.strip().split('\n')[0].strip()
    return ""

def file_description(filepath, content, ext):
    if ext == '.py':
        desc = module_docstring(content)
        if desc:
            return desc
        for line in content.splitlines():
            line = line.strip()
            if line.startswith('#'):
                return line.lstrip('#').strip()
        return ""
    elif ext == '.html':
        match = re.search(r'<!--(.*?)-->', content, re.DOTALL)
        if match:
            return match.group(1).strip()
        return ""
    else:
        for line in content.splitlines():
            line = line.strip()
            if line.startswith('//'):
                return line.lstrip('/').strip()
            if line.startswith('/*'):
                return line.lstrip('/*').rstrip('*/').strip()
        return ""

# ================= EXTRAÇÕES =================
def extract_python_functions(content):
    funcs = set()
    try:
        tree = ast.parse(content)
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                funcs.add(node.name)
    except SyntaxError:
        pass
    return funcs

def extract_js_functions(content):
    funcs = set()
    for m in re.finditer(r'(?:async\s+)?function\s+([a-zA-Z_$][\w$]*)', content):
        name = m.group(1)
        if name != "function":
            funcs.add(name)
    funcs.update(re.findall(r'(?:const|let|var)\s+([a-zA-Z_$][\w$]*)\s*=\s*(?:async\s*)?\(', content))
    return {f for f in funcs if f not in JS_KEYWORDS and len(f) > 1}

def extract_selectors(content):
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
class DevGuideGenerator:
    def __init__(self, root):
        self.root = os.path.abspath(root)
        self.files = []
        self.file_info = {}
        self.file_contents = {}
        self.selector_map = defaultdict(set)
        self.function_map = defaultdict(set)
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

    def analyze(self):
        for filepath in self.files:
            content = read_file(filepath)
            self.file_contents[filepath] = content
            ext = os.path.splitext(filepath)[1].lower()

            selectors = extract_selectors(content)
            functions = set()
            if ext == ".py":
                functions = extract_python_functions(content)
            elif ext == ".js":
                functions = extract_js_functions(content)

            self.file_info[filepath] = {
                "selectors": selectors,
                "functions": functions,
                "ext": ext,
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
                    # tenta resolver caminho relativo a partir da pasta do ficheiro
                    candidate = os.path.normpath(os.path.join(os.path.dirname(filepath), dep))
                    if os.path.exists(candidate):
                        resolved.add(candidate)
                    else:
                        # tenta também a partir da raiz do projeto (para templates)
                        candidate2 = os.path.normpath(os.path.join(self.root, dep))
                        if os.path.exists(candidate2):
                            resolved.add(candidate2)
            for r in resolved:
                self.reverse_deps[r].add(filepath)

    def generate_guide(self):
        self.scan()
        self.analyze()

        lines = []
        lines.append("# Guia do Desenvolvedor (Gerado Automaticamente)")
        lines.append("")
        lines.append("Bem-vindo! Este documento descreve a arquitetura, componentes e padrões do projeto.")
        lines.append("Use-o como referência para adicionar novas funcionalidades ou entender o código existente.")
        lines.append("")

        # 1. Templates Base (deteção melhorada)
        lines.append("## 📄 Templates Base")
        lines.append("")
        base_templates = set()
        for f in self.files:
            if f.endswith('.html'):
                content = self.file_contents.get(f, "")
                for m in re.finditer(r"{%\s*extends\s+['\"](.+?)['\"]\s*%}", content):
                    base_name = m.group(1)
                    # Procura primeiro na mesma pasta do ficheiro
                    base_path = os.path.normpath(os.path.join(os.path.dirname(f), base_name))
                    if not os.path.exists(base_path):
                        # Procura na raiz dos templates (assumindo templates/ na raiz do projeto)
                        base_path = os.path.normpath(os.path.join(self.root, 'templates', base_name))
                    if os.path.exists(base_path):
                        base_templates.add(base_path)
        if base_templates:
            lines.append("Templates que servem de base para outras páginas:")
            for t in sorted(base_templates):
                rel = rel_forward(t, self.root)
                desc = file_description(t, self.file_contents.get(t, ""), '.html')
                lines.append(f"- `{rel}` {desc}")
            lines.append("")
        else:
            lines.append("Nenhum template base detetado automaticamente.")
            lines.append("")

        # 2. Estrutura de Pastas
        lines.append("## 🗂️ Estrutura de Pastas")
        lines.append("")
        dir_counter = Counter()
        files_in_root = []
        for f in self.files:
            rel = rel_forward(f, self.root)
            d = os.path.dirname(rel)
            if d:
                dir_counter[d] += 1
            else:
                files_in_root.append(os.path.basename(f))
        important_dirs = sorted([d for d, c in dir_counter.items() if c >= 2], key=lambda x: -dir_counter[x])
        lines.append("Pastas principais:")
        for d in important_dirs[:15]:
            lines.append(f"- `{d}/` ({dir_counter[d]} ficheiros)")
        if files_in_root:
            lines.append("\nFicheiros soltos na raiz:")
            for f in sorted(files_in_root):
                lines.append(f"- `{f}`")
        lines.append("")

        # 3. Scripts Python
        lines.append("## 🐍 Scripts Python")
        py_files = [f for f in self.files if f.endswith('.py')]
        if py_files:
            lines.append("Ficheiros Python na raiz ou em `core/`:")
            for f in py_files:
                rel = rel_forward(f, self.root)
                if '/' not in rel or rel.startswith('core/'):
                    content = self.file_contents.get(f, "")
                    desc = file_description(f, content, '.py')
                    lines.append(f"- `{rel}` {desc}")
            lines.append("")
        else:
            lines.append("Nenhum script Python encontrado.")
            lines.append("")

        # 4. Como Adicionar uma Nova Página
        lines.append("## 🆕 Como Adicionar uma Nova Página")
        lines.append("")
        if base_templates:
            lines.append("Escolha o template base adequado:")
            for t in sorted(base_templates):
                lines.append(f"- `{rel_forward(t, self.root)}`")
            lines.append("")
        lines.append("1. **Template**: Crie `templates/pages/relatorios.html` que estenda um dos templates base acima.")
        lines.append("2. **Rota**: Adicione em `router.py` uma nova rota (ex: `/relatorios`).")
        lines.append("3. **JavaScript**: Se precisar de interação, crie `static/js/relatorios.js` e importe no bloco `scripts`.")
        lines.append("4. **CSS**: Adicione estilos em `static/css/styles.css` ou crie um ficheiro separado e importe.")
        lines.append("")
        lines.append("### Checklist:")
        lines.append("- [ ] Template estende a base correta")
        lines.append("- [ ] Rota registada")
        lines.append("- [ ] JS importado (se necessário)")
        lines.append("- [ ] CSS adicionado (se necessário)")
        lines.append("")

        # 5. Componentes Reutilizáveis
        lines.append("## 🧩 Componentes Reutilizáveis")
        lines.append("")
        jinja_comps = [f for f in self.files if 'templates/components/' in rel_forward(f, self.root) and f.endswith('.html')]
        if jinja_comps:
            lines.append("### Macros/Componentes Jinja (`templates/components/`)")
            for comp in sorted(jinja_comps):
                name = os.path.basename(comp).replace('.html', '')
                content = self.file_contents.get(comp, "")
                desc = ""
                if 'macro' in content[:100]:
                    desc = " (macro)"
                elif '{% block' in content:
                    desc = " (bloco)"
                lines.append(f"- `{name}.html`{desc}")
            lines.append("")
        else:
            lines.append("Nenhum componente Jinja detetado em `templates/components/`.")
        lines.append("")

        lines.append("### Classes CSS Mais Reutilizadas")
        for sel, files in sorted(self.selector_map.items(), key=lambda x: -len(x[1]))[:8]:
            if not is_utility_class(sel):
                lines.append(f"- `. {sel}` – {len(files)} ficheiros")
        lines.append("")

        lines.append("### Funções JavaScript Utilitárias")
        utils_js = [f for f in self.files if os.path.basename(f) == 'utils.js']
        if utils_js:
            lines.append("Ficheiro principal: `static/js/utils.js`")
            content = self.file_contents[utils_js[0]]
            funcs = extract_js_functions(content)
            for fn in sorted(funcs):
                lines.append(f"- `{fn}()`")
        else:
            shared = [fn for fn, files in self.function_map.items() if len(files) > 1]
            if shared:
                lines.append("Funções partilhadas (considere mover para `utils.js`):")
                for fn in sorted(shared)[:10]:
                    lines.append(f"- `{fn}()`")
        lines.append("")

        # 6. Convenções
        lines.append("## 📝 Convenções de Código")
        kebab = sum(1 for f in self.files if '-' in os.path.basename(f))
        snake = sum(1 for f in self.files if '_' in os.path.basename(f))
        if kebab > snake:
            lines.append("- **Ficheiros**: preferencialmente kebab-case.")
        else:
            lines.append("- **Ficheiros**: preferencialmente snake_case.")
        lines.append("- **Funções JS**: camelCase.")
        lines.append("- **Classes CSS**: kebab-case.")
        lines.append("")

        # 7. Dependências Internas
        lines.append("## 🔗 Dependências Internas")
        centrality = []
        for f, dep_set in self.reverse_deps.items():
            rel = rel_forward(f, self.root)
            if dep_set and not rel.startswith('..'):
                centrality.append((rel, len(dep_set)))
        centrality.sort(key=lambda x: -x[1])
        if centrality:
            lines.append("### Ficheiros mais importados/incluídos")
            for rel, cnt in centrality[:10]:
                lines.append(f"- `{rel}` (usado por {cnt} ficheiros)")
        ext_imports = Counter()
        for fp, info in self.file_info.items():
            if info['ext'] == '.py':
                content = self.file_contents[fp]
                imports = re.findall(r'^import\s+(\S+)', content, re.MULTILINE)
                for imp in imports:
                    if not imp.startswith('.'):
                        ext_imports[imp] += 1
        if ext_imports:
            lines.append("\n### Bibliotecas Externas Mais Importadas")
            for lib, cnt in ext_imports.most_common(5):
                lines.append(f"- `{lib}` ({cnt} ficheiros)")
        lines.append("")

        # 8. Configuração e Arranque
        lines.append("## ⚙️ Configuração e Arranque")
        main_files = [f for f in self.files if os.path.basename(f) in ('router.py', 'app.py', 'main.py')]
        if main_files:
            lines.append("Ficheiros de entrada:")
            for mf in main_files:
                lines.append(f"- `{rel_forward(mf, self.root)}`")
        data_dir = os.path.join(self.root, 'data')
        if os.path.exists(data_dir):
            lines.append(f"\nDados em `data/` com subpastas: {', '.join(os.listdir(data_dir)[:5])}")
        lines.append("")
        lines.append("---")
        lines.append(f"*Guia gerado a partir de {len(self.files)} ficheiros.*")
        return "\n".join(lines)


# ================= GUI =================
class App:
    def __init__(self):
        self.root = Tk()
        self.root.title("AutoDevGuide vFinal")
        self.root.geometry("400x160")
        self.root.resizable(False, False)

        self.folder_path = StringVar()

        frame = Frame(self.root, padx=10, pady=10)
        frame.pack(expand=True, fill="both")

        Label(frame, text="Pasta do projeto:").grid(row=0, column=0, sticky="w")
        Label(frame, textvariable=self.folder_path, fg="blue", wraplength=300).grid(row=0, column=1, sticky="w")

        Button(frame, text="Selecionar Pasta", command=self.browse).grid(row=1, column=1, pady=5, sticky="w")

        self.run_btn = Button(frame, text="Gerar Guia", command=self.generate, state="normal")
        self.run_btn.grid(row=2, column=1, pady=5, sticky="w")

        self.status = StringVar(value="")
        Label(frame, textvariable=self.status, fg="green").grid(row=3, columnspan=2, pady=10)

    def browse(self):
        path = filedialog.askdirectory(title="Selecionar pasta raiz do projeto")
        if path:
            self.folder_path.set(path)

    def generate(self):
        path = self.folder_path.get()
        if not os.path.isdir(path):
            messagebox.showerror("Erro", "Caminho inválido.")
            return
        try:
            gen = DevGuideGenerator(path)
            guide = gen.generate_guide()
            out_file = os.path.join(path, "DEVGUIDE.md")
            with open(out_file, "w", encoding="utf-8") as f:
                f.write(guide)
            self.status.set(f"Guia gerado: {out_file}")
            messagebox.showinfo("Concluído", f"Guia criado com sucesso!\n{out_file}")
        except Exception as e:
            messagebox.showerror("Erro", f"Falha ao gerar guia:\n{e}")

    def run(self):
        self.root.mainloop()

if __name__ == "__main__":
    app = App()
    app.run()