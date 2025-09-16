# 🔧 APISLICER

A FastAPI microservice for slicing 3D models, managing printer profiles, and optimizing model orientation. Part of the KyberCore ecosystem.

## Features

-   **File Upload**: Upload `.stl` and `.gcode` files.
-   **Slicing**: Slice `.stl` files into `.gcode` using PrusaSlicer.
-   **Printer & Job Management**: Manage printer profiles and print jobs via configuration files.
-   **Model Info**: Get detailed information from `.stl` files, including dimensions, volume, and estimated weight.
-   **Basic Auto-Rotation**: Automatically attempts to orient an STL model to minimize its Z-axis height for faster printing.

## Tech Stack

-   FastAPI
-   Uvicorn
-   PrusaSlicer (via AppImage)
-   Docker

## API Reference

### `POST /upload/`

Uploads an STL or G-code file. If an STL is provided, it can be associated with a `job_id` to create a corresponding job configuration file.

-   **Body**: `multipart/form-data`
    -   `file`: The `.stl` or `.gcode` file.
    -   `job_id`: (Optional) A string representing the job ID.

-   **Response**:
    ```json
    {
      "message": "Configuration created for job_id",
      "job_id": "job_id",
      "filename": "your_file.stl"
    }
    ```

### `POST /slice/`

Slices a given `.stl` file using a specified printer and quality profile.

-   **Body**: `multipart/form-data`
    -   `file`: The `.stl` file to slice.
    -   `printer_name`: The name of the printer profile to use (e.g., `ender3`). Corresponds to a file in `config/printer_config/`.
    -   `quality_profile`: The name of the quality profile (e.g., `test-abs-quality`). Corresponds to a file in `config/printer_stl_config/`.

-   **Response**:
    ```json
    {
      "message": "Slicing successful",
      "output_path": "/output/your_file.gcode"
    }
    ```

### `POST /auto-rotate/`

Performs a basic auto-rotation on the specified STL file to find an orientation that minimizes Z-height. It saves the rotated model as a new file.

-   **Body**: `application/json`
    ```json
    {
      "filename": "your_file.stl"
    }
    ```

-   **Response**:
    ```json
    {
      "new_filename": "your_file_rotated.stl",
      "rotation": [0, 90, 0], // Example rotation matrix
      "new_dimensions": {
        "width": 100,
        "height": 50,
        "depth": 120
      }
    }
    ```

### `GET /model-info/{filename}`

Retrieves detailed information about a specific `.stl` model.

-   **Path Parameter**:
    -   `filename`: The name of the `.stl` file in the `uploads/` directory.

-   **Response**:
    ```json
    {
      "filename": "your_file.stl",
      "dimensions": { "width": 100, "height": 120, "depth": 50 },
      "volume_cm3": 150.0,
      "weight_grams": 187.5,
      "info": "..."
    }
    ```

### `GET /jobs/`

Lists all available print jobs by reading the configuration files.

-   **Response**: A JSON object containing the configurations of all jobs.

### `GET /printers/`

Lists all available printer profiles.

-   **Response**: A JSON object containing the configurations of all printers.

## Visualizing Models

This service serves the `uploads` and `output` directories statically. You can use a client-side JavaScript library like `three.js` to build a 3D viewer for the STL models.

Here is a basic example of an HTML file that can view an STL model served by this API. Note that for a full implementation, you would need to include `STLLoader.js` and `OrbitControls.js` from Three.js.

```html
<!DOCTYPE html>
<html>
<head>
    <title>STL Viewer</title>
    <style>
        body { margin: 0; }
        canvas { display: block; }
    </style>
</head>
<body>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script>
        // This example requires STLLoader.js and OrbitControls.js
        // You would typically include them locally or from a CDN
        // For a complete example, see the three.js documentation.

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xaaaaaa);

        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 50;

        const renderer = new THREE.WebGLRenderer();
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(renderer.domElement);

        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);
        const pointLight = new THREE.PointLight(0xffffff, 0.5);
        pointLight.position.set(100, 100, 100);
        scene.add(pointLight);

        // Load STL model
        // Replace 'your_model.stl' with the actual model filename
        // The URL points to the static path served by APISLICER
        const loader = new THREE.STLLoader();
        loader.load('http://localhost:8001/uploads/your_model.stl', function (geometry) {
            const material = new THREE.MeshStandardMaterial({color: 0x00ff00});
            const mesh = new THREE.Mesh(geometry, material);
            scene.add(mesh);

            // Add controls for interaction (OrbitControls)
            // const controls = new THREE.OrbitControls(camera, renderer.domElement);
        });

        function animate() {
            requestAnimationFrame(animate);
            // controls.update();
            renderer.render(scene, camera);
        }
        animate();
    </script>
</body>
</html>
```
