#!/usr/bin/env python3
"""Gera o app inteiro em um arquivo só.

Junta o CSS e todos os scripts dentro do index.html, para que o app possa ser
guardado e aberto com dois cliques, sem servidor e sem internet:

    python3 ferramentas/gerar-arquivo-unico.py            -> minha-rotina.html

Com --artefato, gera a mesma coisa sem as tags externas do documento, no
formato que a publicação em página hospedada espera:

    python3 ferramentas/gerar-arquivo-unico.py --artefato caminho/saida.html
"""

import base64
import pathlib
import re
import sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
SAIDA = RAIZ / 'minha-rotina.html'


def ler(caminho):
    return (RAIZ / caminho).read_text(encoding='utf-8')


def montar():
    html = ler('index.html')

    # o ícone vira data URI, para o arquivo não depender da pasta assets/
    icone = base64.b64encode(ler('assets/icon.svg').encode('utf-8')).decode('ascii')
    html = html.replace('href="assets/icon.svg"', 'href="data:image/svg+xml;base64,%s"' % icone)

    # a folha de estilo entra inteira no lugar do <link>
    css = ler('assets/styles.css')
    html = re.sub(
        r'  <link rel="stylesheet" href="assets/styles\.css" />',
        '  <style>\n%s\n  </style>' % css,
        html,
    )

    # sem servidor não há manifesto nem service worker
    html = re.sub(r'\s*<link rel="manifest"[^>]*>', '', html)

    def inline(m):
        return '<script>\n%s\n</script>' % ler(m.group(1))

    html = re.sub(r'<script src="([^"]+)"></script>', inline, html)

    # sem pasta ao lado, não há service worker para registrar
    html = re.sub(
        r"\n    if \('serviceWorker' in navigator.*?\n    \}\n",
        "\n",
        html,
        flags=re.S,
    )

    return html


def artefato(caminho):
    """Só o conteúdo da página: título, estilo, corpo e scripts."""
    html = montar()
    titulo = re.search(r'<title>.*?</title>', html, re.S).group(0)
    estilo = re.search(r'<style>.*?</style>', html, re.S).group(0)
    corpo = re.search(r'<body>(.*)</body>', html, re.S).group(1)

    # o tema é aplicado antes de tudo, para a página não piscar
    inicial = '<script>document.documentElement.setAttribute("data-theme","auto");</script>'

    saida = pathlib.Path(caminho)
    saida.write_text('\n'.join([titulo, estilo, inicial, corpo]), encoding='utf-8')
    print('%s · %.0f KB' % (saida.name, saida.stat().st_size / 1024))


def main():
    html = montar()

    aviso = ('<!-- Minha Rotina — arquivo único, gerado por '
             'ferramentas/gerar-arquivo-unico.py.\n'
             '     Seus dados ficam no armazenamento deste navegador; guarde um backup '
             'pelo próprio app. -->\n')
    SAIDA.write_text(aviso + html, encoding='utf-8')
    print('%s · %.0f KB' % (SAIDA.name, SAIDA.stat().st_size / 1024))


if __name__ == '__main__':
    if '--artefato' in sys.argv:
        artefato(sys.argv[sys.argv.index('--artefato') + 1])
    else:
        main()
