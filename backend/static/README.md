# Backend Test UI

This is a standalone frontend interface for testing the Ninja PDF backend features.

## How to use

1.  Ensure the Django backend is running:
    ```bash
    python manage.py runserver
    ```
2.  Open your browser and navigate to `http://127.0.0.1:8000/`.
3.  You will see the "Ninja PDF Backend Tester" dashboard.
4.  Click on a tool (e.g., "PDF to Excel") to open the upload modal.
5.  Select a file and click "Convert".

## Configuration

-   The frontend files are located in `backend/static/`.
-   The main entry point is served by the `home` view in `backend/core/views.py`.
-   The API endpoints are expected to be at `/api/{tool-name}/`. You need to implement these endpoints in your Django apps (`from_pdf`, `to_pdf`) and wire them up in `backend/core/urls.py`.

## Customization

-   Edit `backend/static/index.html` to add more tools or change the layout.
-   Edit `backend/static/css/style.css` for styling.
-   Edit `backend/static/js/script.js` to modify the API interaction logic.
