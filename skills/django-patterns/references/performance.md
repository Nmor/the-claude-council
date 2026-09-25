# Django - Query Performance

> Covers N+1 prevention (`select_related` / `prefetch_related`), database
> indexing, and bulk operations. Pointed at by the **Query performance** row of
> the `SKILL.md` routing table.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Performance Optimization

### N+1 Query Prevention

```python
# Bad - N+1 queries
products = Product.objects.all()
for product in products:
    print(product.category.name)  # Separate query for each product

# Good - Single query with select_related
products = Product.objects.select_related('category').all()
for product in products:
    print(product.category.name)

# Good - Prefetch for many-to-many
products = Product.objects.prefetch_related('tags').all()
for product in products:
    for tag in product.tags.all():
        print(tag.name)
```

### Database Indexing

```python
class Product(models.Model):
    name = models.CharField(max_length=200, db_index=True)
    slug = models.SlugField(unique=True)
    category = models.ForeignKey('Category', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['-created_at']),
            models.Index(fields=['category', 'created_at']),
        ]
```

### Bulk Operations

```python
# Bulk create
Product.objects.bulk_create([
    Product(name=f'Product {i}', price=10.00)
    for i in range(1000)
])

# Bulk update
products = Product.objects.all()[:100]
for product in products:
    product.is_active = True
Product.objects.bulk_update(products, ['is_active'])

# Bulk delete
Product.objects.filter(stock=0).delete()
```
