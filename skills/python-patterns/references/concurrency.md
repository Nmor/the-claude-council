# python-patterns: Concurrency Patterns

> Covers threading for I/O-bound work, multiprocessing for CPU-bound work, and async/await. Pointed
> at by the **Concurrency** row in [`../SKILL.md`](../SKILL.md).
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Concurrency Patterns

### Threading for I/O-Bound Tasks

```python
import concurrent.futures
import threading

def fetch_url(url: str) -> str:
    """Fetch a URL (I/O-bound operation)."""
    import urllib.request
    with urllib.request.urlopen(url) as response:
        return response.read().decode()

def fetch_all_urls(urls: list[str]) -> dict[str, str]:
    """Fetch multiple URLs concurrently using threads."""
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        future_to_url = {executor.submit(fetch_url, url): url for url in urls}
        results = {}
        for future in concurrent.futures.as_completed(future_to_url):
            url = future_to_url[future]
            try:
                results[url] = future.result()
            except Exception as e:
                results[url] = f"Error: {e}"
    return results
```

### Multiprocessing for CPU-Bound Tasks

```python
def process_data(data: list[int]) -> int:
    """CPU-intensive computation."""
    return sum(x ** 2 for x in data)

def process_all(datasets: list[list[int]]) -> list[int]:
    """Process multiple datasets using multiple processes."""
    with concurrent.futures.ProcessPoolExecutor() as executor:
        results = list(executor.map(process_data, datasets))
    return results
```

### Async/Await for Concurrent I/O

```python
import asyncio

async def fetch_async(url: str) -> str:
    """Fetch a URL asynchronously."""
    import aiohttp
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            return await response.text()

async def fetch_all(urls: list[str]) -> dict[str, str]:
    """Fetch multiple URLs concurrently."""
    tasks = [fetch_async(url) for url in urls]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return dict(zip(urls, results))
```
