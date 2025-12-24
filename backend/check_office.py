"""
Check what Office apps are available and download LibreOffice if needed
"""
import sys
import os
import subprocess
import shutil

print("=" * 50)
print("Office Installation Check")
print("=" * 50)

# Check for Microsoft Office via registry
try:
    import winreg
    
    office_paths = [
        r"SOFTWARE\Microsoft\Office",
        r"SOFTWARE\WOW6432Node\Microsoft\Office",
    ]
    
    office_apps = ['Word', 'Excel', 'PowerPoint']
    found_apps = []
    
    for base_path in office_paths:
        try:
            with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, base_path) as key:
                for app in office_apps:
                    try:
                        # Check various versions
                        for version in ['16.0', '15.0', '14.0']:
                            try:
                                subkey = f"{version}\\{app}\\InstallRoot"
                                with winreg.OpenKey(key, subkey) as app_key:
                                    path = winreg.QueryValueEx(app_key, "Path")[0]
                                    if os.path.exists(path):
                                        found_apps.append(f"{app} ({version})")
                            except:
                                pass
                    except:
                        pass
        except:
            pass
    
    if found_apps:
        print(f"✓ Microsoft Office found: {', '.join(found_apps)}")
    else:
        print("✗ Microsoft Office NOT detected")
        
except Exception as e:
    print(f"Could not check Office: {e}")

# Check for LibreOffice
print("\nChecking LibreOffice...")
lo_paths = [
    r"C:\Program Files\LibreOffice\program\soffice.exe",
    r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
]
lo_found = None
for p in lo_paths:
    if os.path.exists(p):
        lo_found = p
        break
        
if lo_found:
    print(f"✓ LibreOffice found at: {lo_found}")
else:
    in_path = shutil.which('soffice')
    if in_path:
        print(f"✓ LibreOffice in PATH: {in_path}")
    else:
        print("✗ LibreOffice NOT found")

# Check winget availability
print("\nChecking package managers...")
winget = shutil.which('winget')
if winget:
    print(f"✓ winget available")
else:
    print("✗ winget not available")

print("\n" + "=" * 50)
print("RECOMMENDATION")
print("=" * 50)

if lo_found or shutil.which('soffice'):
    print("LibreOffice is installed. Conversions should work!")
elif winget:
    print("To install LibreOffice (FREE), run this command:")
    print("\n    winget install -e --id TheDocumentFoundation.LibreOffice\n")
else:
    print("Please download LibreOffice from:")
    print("\n    https://www.libreoffice.org/download/download/\n")
    print("This will enable Word, Excel, and PowerPoint conversions.")
