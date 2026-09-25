
# Content-Hash File Caching

> Covers content-hash file caching: the SHA-256 cache key, frozen cache entries, the service-layer
> wrapper, anti-patterns and best practices. Pointed at by the "Content-hash file caching" row of
> `SKILL.md`.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Content-hash file caching

Cache expensive file processing results (PDF parsing, text
extraction, image analysis) using SHA-256 content hashes as
cache keys. Unlike path-based caching, this approach survives
file moves / renames and auto-invalidates when content changes.

Use when: file processing pipelines, CLI tools that benefit from
`--cache / --no-cache`, batch processing where the same files
recur, adding caching to existing pure functions without
modifying them.

Avoid when: data must always be fresh (real-time feeds); cache
entries would be extremely large (stream instead); results
depend on parameters beyond file content (e.g., different
extraction configs).

### Content-hash cache key

```python
import hashlib
from pathlib import Path

_HASH_CHUNK_SIZE = 65536  # 64KB chunks for large files

def compute_file_hash(path: Path) -> str:
    """SHA-256 of file contents (chunked for large files)."""
    if not path.is_file():
        raise FileNotFoundError(f"File not found: {path}")
    sha256 = hashlib.sha256()
    with open(path, "rb") as f:
        while True:
            chunk = f.read(_HASH_CHUNK_SIZE)
            if not chunk:
                break
            sha256.update(chunk)
    return sha256.hexdigest()
```

File rename / move = cache hit (content identity preserved).
Content change = automatic invalidation. No index file needed.

### Frozen cache entry + file storage

```python
from dataclasses import dataclass

@dataclass(frozen=True, slots=True)
class CacheEntry:
    file_hash: str
    source_path: str
    document: ExtractedDocument  # The cached result
```

Each cache entry is stored as `{hash}.json` — O(1) lookup by
hash, no index file.

```python
import json

def write_cache(cache_dir: Path, entry: CacheEntry) -> None:
    cache_dir.mkdir(parents=True, exist_ok=True)
    cache_file = cache_dir / f"{entry.file_hash}.json"
    data = serialize_entry(entry)
    cache_file.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")

def read_cache(cache_dir: Path, file_hash: str) -> CacheEntry | None:
    cache_file = cache_dir / f"{file_hash}.json"
    if not cache_file.is_file():
        return None
    try:
        raw = cache_file.read_text(encoding="utf-8")
        data = json.loads(raw)
        return deserialize_entry(data)
    except (json.JSONDecodeError, ValueError, KeyError):
        return None  # Treat corruption as cache miss
```

### Service-layer wrapper (SRP)

Processing function stays pure. Caching is a separate concern.

```python
def extract_with_cache(
    file_path: Path,
    *,
    cache_enabled: bool = True,
    cache_dir: Path = Path(".cache"),
) -> ExtractedDocument:
    if not cache_enabled:
        return extract_text(file_path)  # pure; no cache knowledge

    file_hash = compute_file_hash(file_path)

    cached = read_cache(cache_dir, file_hash)
    if cached is not None:
        logger.info("Cache hit: %s (hash=%s)", file_path.name, file_hash[:12])
        return cached.document

    logger.info("Cache miss: %s (hash=%s)", file_path.name, file_hash[:12])
    doc = extract_text(file_path)
    entry = CacheEntry(file_hash=file_hash, source_path=str(file_path), document=doc)
    write_cache(cache_dir, entry)
    return doc
```

### Anti-patterns

```python
# WRONG — path-based caching breaks on rename
cache = {"/path/to/file.pdf": result}

# WRONG — cache logic inside pure function (SRP violation)
def extract_text(path, *, cache_enabled=False, cache_dir=None):
    if cache_enabled:  # function now has two responsibilities
        ...

# WRONG — dataclasses.asdict() with nested frozen dataclasses
# (issues with complex nested types — use manual serialization)
data = dataclasses.asdict(entry)
```

### Best practices

- Hash content, not paths — paths change, content identity doesn't
- Chunk large files — avoid loading entire files into memory
- Keep processing functions pure — they know nothing about caching
- Log cache hit / miss with truncated hashes for debugging
- Handle corruption gracefully — treat invalid entries as misses,
  never crash
