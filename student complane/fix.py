import glob

for html_file in glob.glob('templates/*.html'):
    with open(html_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace literal \n with an actual newline
    if '\\n</body>' in content:
        content = content.replace('\\n</body>', '\n</body>')
        with open(html_file, 'w', encoding='utf-8') as f:
            f.write(content)
    elif '\\n' in content[-20:]: # just in case
        content = content.replace('\\n', '\n')
        with open(html_file, 'w', encoding='utf-8') as f:
            f.write(content)
