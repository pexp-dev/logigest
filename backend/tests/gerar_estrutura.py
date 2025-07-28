import os

def gerar_estrutura_arvore(base_dir='.', output_file='arquivo/estrutura.txt'):
    ignore_dirs = {'.git', '__pycache__', 'node_modules'}
    
    def montar_arvore(caminho, prefixo=''):
        linhas = []
        itens = sorted(os.listdir(caminho))
        itens = [i for i in itens if i not in ignore_dirs]
        total = len(itens)

        for idx, item in enumerate(itens):
            caminho_item = os.path.join(caminho, item)
            conector = '└── ' if idx == total -1 else '├── '
            linha = prefixo + conector + item
            linhas.append(linha)

            if os.path.isdir(caminho_item):
                novo_prefixo = prefixo + ('    ' if idx == total -1 else '│   ')
                linhas.extend(montar_arvore(caminho_item, novo_prefixo))
        return linhas

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('/\n')
        linhas = montar_arvore(base_dir)
        f.write('\n'.join(linhas))
        f.write('\n')

if __name__ == "__main__":
    gerar_estrutura_arvore()
