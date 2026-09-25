# python-testing: Markers and Test Selection

> Covers **Markers and Test Selection** for the `python-testing` skill. Routed from the reference
> map in `../SKILL.md`.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Markers and Test Selection

### Custom Markers

```python
# Mark slow tests
@pytest.mark.slow
def test_slow_operation():
    time.sleep(5)

# Mark integration tests
@pytest.mark.integration
def test_api_integration():
    response = requests.get("https://api.example.com")
    assert response.status_code == 200

# Mark unit tests
@pytest.mark.unit
def test_unit_logic():
    assert calculate(2, 3) == 5
```

### Run Specific Tests

```bash
# Run only fast tests
pytest -m "not slow"

# Run only integration tests
pytest -m integration

# Run integration or slow tests
pytest -m "integration or slow"

# Run tests marked as unit but not slow
pytest -m "unit and not slow"
```

### Configure Markers in pytest.ini

```ini
[pytest]
markers =
    slow: marks tests as slow
    integration: marks tests as integration tests
    unit: marks tests as unit tests
    django: marks tests as requiring Django
```
