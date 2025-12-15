# Quick Start Test

## Test 1: Start the server

```bash
cd editing_engine/java-pdf-editor-backend
java -jar target/pdf-editor-backend-1.0.0.jar
```

Server should start on `http://localhost:8080`

## Test 2: Health Check

```bash
curl http://localhost:8080/api/pdf/health
```

Expected response: `PDF Editor Service is running`

## Test 3: Edit PDF (PowerShell)

Create a test JSON file:

```powershell
@"
{
  "pageWidth": 595,
  "pageHeight": 842,
  "objects": [
    {
      "type": "text",
      "content": "Hello from Java Backend!",
      "x": 100,
      "y": 100,
      "fontSize": 24,
      "fontFamily": "Helvetica",
      "color": "#FF0000",
      "rotation": 0
    }
  ]
}
"@ | Out-File -FilePath layout.json -Encoding utf8
```

Test with a sample PDF:

```powershell
curl.exe -X POST http://localhost:8080/api/pdf/edit `
  -F "pdf=@your-sample.pdf" `
  -F "layout=$(Get-Content layout.json -Raw)" `
  -o edited.pdf
```

## Alternative: Run with Maven

```bash
cd editing_engine/java-pdf-editor-backend
./mvnw spring-boot:run
```

or on Windows:

```powershell
cd editing_engine\java-pdf-editor-backend
& 'C:\Program Files\Microsoft\jdk-17.0.17.10-hotspot\bin\java.exe' -classpath ".mvn\wrapper\maven-wrapper.jar" "-Dmaven.multiModuleProjectDirectory=$PWD" org.apache.maven.wrapper.MavenWrapperMain spring-boot:run
```
