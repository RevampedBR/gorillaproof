import os
import glob

def replace_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content.replace("catch (err) {", "catch {")
    new_content = new_content.replace("catch(err) {", "catch {")
    new_content = new_content.replace("catch (error) {", "catch {")
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

files = glob.glob('src/**/*.ts', recursive=True) + glob.glob('src/**/*.tsx', recursive=True)
for file in files:
    replace_in_file(file)
