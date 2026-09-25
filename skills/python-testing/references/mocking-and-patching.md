# python-testing: Mocking and Patching

> Covers **Mocking and Patching** for the `python-testing` skill. Routed from the reference map in
> `../SKILL.md`.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Mocking and Patching

### Mocking Functions

```python
from unittest.mock import patch, Mock

@patch("mypackage.external_api_call")
def test_with_mock(api_call_mock):
    """Test with mocked external API."""
    api_call_mock.return_value = {"status": "success"}

    result = my_function()

    api_call_mock.assert_called_once()
    assert result["status"] == "success"
```

### Mocking Return Values

```python
@patch("mypackage.Database.connect")
def test_database_connection(connect_mock):
    """Test with mocked database connection."""
    connect_mock.return_value = MockConnection()

    db = Database()
    db.connect()

    connect_mock.assert_called_once_with("localhost")
```

### Mocking Exceptions

```python
@patch("mypackage.api_call")
def test_api_error_handling(api_call_mock):
    """Test error handling with mocked exception."""
    api_call_mock.side_effect = ConnectionError("Network error")

    with pytest.raises(ConnectionError):
        api_call()

    api_call_mock.assert_called_once()
```

### Mocking Context Managers

```python
@patch("builtins.open", new_callable=mock_open)
def test_file_reading(mock_file):
    """Test file reading with mocked open."""
    mock_file.return_value.read.return_value = "file content"

    result = read_file("test.txt")

    mock_file.assert_called_once_with("test.txt", "r")
    assert result == "file content"
```

### Using Autospec

```python
@patch("mypackage.DBConnection", autospec=True)
def test_autospec(db_mock):
    """Test with autospec to catch API misuse."""
    db = db_mock.return_value
    db.query("SELECT * FROM users")

    # This would fail if DBConnection doesn't have query method
    db_mock.assert_called_once()
```

### Mock Class Instances

```python
class TestUserService:
    @patch("mypackage.UserRepository")
    def test_create_user(self, repo_mock):
        """Test user creation with mocked repository."""
        repo_mock.return_value.save.return_value = User(id=1, name="Alice")

        service = UserService(repo_mock.return_value)
        user = service.create_user(name="Alice")

        assert user.name == "Alice"
        repo_mock.return_value.save.assert_called_once()
```

### Mock Property

```python
@pytest.fixture
def mock_config():
    """Create a mock with a property."""
    config = Mock()
    type(config).debug = PropertyMock(return_value=True)
    type(config).api_key = PropertyMock(return_value="test-key")
    return config

def test_with_mock_config(mock_config):
    """Test with mocked config properties."""
    assert mock_config.debug is True
    assert mock_config.api_key == "test-key"
```
