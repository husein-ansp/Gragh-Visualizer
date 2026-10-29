
# Graph Visualizer

An interactive graph visualization tool for testing graph algorithms.

## Features

- Generate simple undirected graphs.
- Specify the number of vertices and edges.
- Drag vertices to change their positions.
- Pan and zoom around the graph.
- View graph statistics.
- Validate graph parameters on the server.
- Test graph generation with automated tests.

## Technologies

- Python
- Django
- HTML5 and CSS3
- JavaScript and SVG
- Bootstrap 5
- Git and GitHub

## Installation

Create and activate a Python virtual environment, then install Django:

```bash
python -m pip install "Django>=5.2,<5.3"
```

Run database migrations:

```bash
python manage.py migrate
```

Start the development server:

```bash
python manage.py runserver
```

Open http://127.0.0.1:8000/ in your browser.

## Run tests

```bash
python manage.py test
```

## Project Status

Educational project under development.

## Security

The application validates graph parameters on the server
and uses Django CSRF protection.

Further security testing is required before public deployment.
