# Input and Data Safety

> Covers Bean Validation, SQL-injection prevention, password encoding and file uploads. Pointed at
> by the "Input + data safety" row in `../SKILL.md`.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Input Validation

- Use Bean Validation with `@Valid` on controllers
- Apply constraints on DTOs: `@NotBlank`, `@Email`, `@Size`, custom validators
- Sanitize any HTML with a whitelist before rendering

```java
// BAD: No validation
@PostMapping("/users")
public User createUser(@RequestBody UserDto dto) {
  return userService.create(dto);
}

// GOOD: Validated DTO
public record CreateUserDto(
    @NotBlank @Size(max = 100) String name,
    @NotBlank @Email String email,
    @NotNull @Min(0) @Max(150) Integer age
) {}

@PostMapping("/users")
public ResponseEntity<UserDto> createUser(@Valid @RequestBody CreateUserDto dto) {
  return ResponseEntity.status(HttpStatus.CREATED)
      .body(userService.create(dto));
}
```

## SQL Injection Prevention

- Use Spring Data repositories or parameterized queries
- For native queries, use `:param` bindings; never concatenate strings

```java
// BAD: String concatenation in native query
@Query(value = "SELECT * FROM users WHERE name = '" + name + "'", nativeQuery = true)

// GOOD: Parameterized native query
@Query(value = "SELECT * FROM users WHERE name = :name", nativeQuery = true)
List<User> findByName(@Param("name") String name);

// GOOD: Spring Data derived query (auto-parameterized)
List<User> findByEmailAndActiveTrue(String email);
```

## Password Encoding

- Always hash passwords with BCrypt or Argon2 — never store plaintext
- Use `PasswordEncoder` bean, not manual hashing

```java
@Bean
public PasswordEncoder passwordEncoder() {
  return new BCryptPasswordEncoder(12); // cost factor 12
}

// In service
public User register(CreateUserDto dto) {
  String hashedPassword = passwordEncoder.encode(dto.password());
  return userRepository.save(new User(dto.email(), hashedPassword));
}
```

## File Uploads

- Validate size, content type, and extension
- Store outside web root; scan if required
