
from django.urls import path
from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path(
        "api/generate/",
        views.generate_graph,
        name="generate_graph",
    ),
]
