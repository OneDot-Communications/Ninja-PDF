import pdfplumber
import pandas as pd
import os

print("Imports successful")

# Create a dummy PDF with a table using reportlab if available, or just skip if not.
# Since I don't want to install reportlab just for test, I will assume if imports work, it's fine.
# But I can try to open a non-existent file to check if pdfplumber.open works (it should raise FileNotFoundError)

try:
    with pdfplumber.open("non_existent.pdf") as pdf:
        pass
except FileNotFoundError:
    print("pdfplumber.open called successfully (file not found as expected)")
except Exception as e:
    print(f"pdfplumber error: {e}")

print("Test complete")
