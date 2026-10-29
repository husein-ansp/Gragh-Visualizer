
import json

from django.test import TestCase
from django.urls import reverse


class GraphGenerationTests(TestCase):
    def test_homepage_returns_success(self):
        response = self.client.get(reverse("index"))

        self.assertEqual(response.status_code, 200)

    def test_generates_requested_graph(self):
        response = self.client.post(
            reverse("generate_graph"),
            data=json.dumps({"nodes": 5, "edges": 4}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertEqual(len(data["nodes"]), 5)
        self.assertEqual(len(data["edges"]), 4)

    def test_rejects_too_many_edges(self):
        response = self.client.post(
            reverse("generate_graph"),
            data=json.dumps({"nodes": 3, "edges": 4}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)

    def test_rejects_non_integer_counts(self):
        response = self.client.post(
            reverse("generate_graph"),
            data=json.dumps({"nodes": True, "edges": 1}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)

    def test_rejects_get_for_api(self):
        response = self.client.get(reverse("generate_graph"))

        self.assertEqual(response.status_code, 405)
