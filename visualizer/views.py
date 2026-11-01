
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

        if not 2 <= nodes_count <= MAX_NODES:
            raise ValueError("Invalid number of vertices.")
        
        max_edges = nodes_count * (nodes_count - 1) // 2

        # حداقل تعداد یال برای اینکه هیچ رأسی بدون یال نماند
        min_edges = (nodes_count + 1) // 2

        if not min_edges <= edges_count <= max_edges:
            raise ValueError("Invalid number of edges.")
        
                # ساخت فهرست رأس‌ها و به‌هم‌زدن ترتیب آن‌ها
        node_ids = list(range(nodes_count))
        random.shuffle(node_ids)

        # ابتدا برای تمام رأس‌ها حداقل یک یال ایجاد می‌کنیم
        selected_edges = []

        # جفت کردن رأس‌ها
        for i in range(0, nodes_count - 1, 2):
            u, v = sorted((node_ids[i], node_ids[i + 1]))
            selected_edges.append((u, v))

        # اگر تعداد رأس‌ها فرد باشد، رأس آخر را به یک رأس دیگر وصل می‌کنیم
        if nodes_count % 2 == 1:
            u, v = sorted((node_ids[-1], node_ids[0]))
            selected_edges.append((u, v))

        # ثبت یال‌های ساخته‌شده برای جلوگیری از تکرار
        selected_edge_set = set(selected_edges)

        # ساخت فهرست تمام یال‌هایی که هنوز انتخاب نشده‌اند
        possible_edges = [
            (u, v)
            for u in range(nodes_count)
            for v in range(u + 1, nodes_count)
            if (u, v) not in selected_edge_set
        ]

        # انتخاب تصادفی یال‌های باقی‌مانده
        extra_edges = random.sample(
            possible_edges,
            edges_count - len(selected_edges),
        )

        # اضافه کردن یال‌های جدید به گراف
        selected_edges.extend(extra_edges)

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