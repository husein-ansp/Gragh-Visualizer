
import json
import random

from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.http import require_POST


MAX_NODES = 150
MAX_REQUEST_BYTES = 4096


def index(request):
    return render(request, "visualizer/index.html")


@require_POST
def generate_graph(request):
    if len(request.body) > MAX_REQUEST_BYTES:
        return JsonResponse(
            {"error": "Request body is too large."},
            status=413,
        )

    try:
        data = json.loads(request.body)

        if not isinstance(data, dict):
            raise ValueError("Expected a JSON object.")

        nodes_count = data.get("nodes")
        edges_count = data.get("edges")

        if (
            type(nodes_count) is not int
            or type(edges_count) is not int
        ):
            raise ValueError("Counts must be integers.")

        if not 1 <= nodes_count <= MAX_NODES:
            raise ValueError("Invalid number of vertices.")

        max_edges = nodes_count * (nodes_count - 1) // 2

        if not 0 <= edges_count <= max_edges:
            raise ValueError("Invalid number of edges.")

        possible_edges = [
            (u, v)
            for u in range(nodes_count)
            for v in range(u + 1, nodes_count)
        ]

        selected_edges = random.sample(
            possible_edges,
            edges_count,
        )

        return JsonResponse({
            "nodes": list(range(nodes_count)),
            "edges": [
                {"source": u, "target": v}
                for u, v in selected_edges
            ],
        })

    except (
        json.JSONDecodeError,
        UnicodeDecodeError,
        ValueError,
    ):
        return JsonResponse(
            {"error": "Invalid graph parameters."},
            status=400,
        )
