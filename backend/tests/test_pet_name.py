"""Pet names use Unicode code points consistently for create and update."""
import pytest
from pydantic import ValidationError
from app.schemas.pet import PetCreateRequest, PetUpdateRequest


@pytest.mark.parametrize("model", [PetCreateRequest, PetUpdateRequest])
@pytest.mark.parametrize("name", ["犬" * 20, "A" * 20, "🐶" * 20, "犬🐶" * 10])
def test_accepts_twenty_character_names(model, name):
    data = dict(name=name, gender="male", breed="mixed", arrivalDate="2026-10-12")
    if model is PetCreateRequest:
        data["userId"] = "a" * 24
    assert model(**data).name == name


@pytest.mark.parametrize("model", [PetCreateRequest, PetUpdateRequest])
@pytest.mark.parametrize("name", ["犬" * 21, "A" * 21, "🐶" * 21])
def test_rejects_twenty_one_character_names(model, name):
    data = dict(name=name, gender="male", breed="mixed", arrivalDate="2026-10-12")
    if model is PetCreateRequest:
        data["userId"] = "a" * 24
    with pytest.raises(ValidationError):
        model(**data)
