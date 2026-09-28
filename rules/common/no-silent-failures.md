# Visible failures

> Size budget: 2 KB.

Return or record actionable failure context, preserve error causes, and do not silently drop failed work or malformed data. Handle expected missing optional inputs explicitly. Tests and shell pipelines must retain their real exit status; filtering output must not convert failure into success.

For relevant detailed procedures and examples, read
[the reference](../../rules-library/council-detail/no-silent-failures.md).
Do not preload it for unrelated work.
