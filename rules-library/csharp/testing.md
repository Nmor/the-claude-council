---
paths:
  - "**/*Tests.cs"
  - "**/*Test.cs"
  - "**/Tests/**/*.cs"
---

# C# Testing

> Extends `common/testing.md` with C#-specific testing conventions.

## Minimum Test Coverage: 70%

## Testing Frameworks

- Unit tests: xUnit (preferred) or NUnit
- Mocking: Moq or NSubstitute
- Assertions: FluentAssertions

```csharp
public class UserServiceTests
{
    private readonly Mock<IUserRepository> _mockRepo = new();
    private readonly UserService _sut;

    public UserServiceTests()
    {
        _sut = new UserService(_mockRepo.Object);
    }

    [Fact]
    public async Task GetUser_WithValidId_ReturnsUser()
    {
        // Arrange
        var expected = new User("1", "Alice", "alice@test.com");
        _mockRepo.Setup(r => r.GetByIdAsync("1", default))
                 .ReturnsAsync(expected);

        // Act
        var result = await _sut.GetUserAsync("1");

        // Assert
        result.Should().BeEquivalentTo(expected);
    }

    [Fact]
    public async Task GetUser_WithInvalidId_ThrowsNotFoundException()
    {
        _mockRepo.Setup(r => r.GetByIdAsync("bad", default))
                 .ReturnsAsync((User?)null);

        var act = () => _sut.GetUserAsync("bad");

        await act.Should().ThrowAsync<NotFoundException>();
    }
}
```
