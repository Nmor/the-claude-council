---
name: django-patterns
description: Django + Django REST Framework implementation discipline — project layout, model design, DRF serializers/viewsets, service layer, caching, signals, middleware, query performance, AND the full Django security surface (SECURE_* settings, authentication, authorization, SQL-injection and XSS prevention, CSRF, file-upload hardening, API security, security headers, secret handling, security event logging). Use when writing or reviewing any Django models.py, views.py, serializers.py, urls.py, settings.py, middleware or migration.
paths:
  - "**/models.py"
  - "**/views.py"
  - "**/viewsets.py"
  - "**/serializers.py"
  - "**/urls.py"
  - "**/admin.py"
  - "**/apps.py"
  - "**/forms.py"
  - "**/permissions.py"
  - "**/tasks.py"
  - "**/middleware.py"
  - "**/settings.py"
  - "**/settings/*.py"
  - "**/manage.py"
  - "**/migrations/*.py"
---

# Django Development Patterns

> **Reuse-first** (per `~/.claude/rules-library/common/reuse-first.md`):
> One source of truth per Django concept — one base
> `ModelSerializer` per shared shape, one custom permission
> class per access rule, one mixin per cross-cutting view
> behaviour, one signal handler per event. Sweep `apps/<app>/`
> for existing primitives before adding new ones. Extend via
> subclass / mixin / Meta inheritance — never fork a serializer
> or view into a parallel near-duplicate.

Production-grade Django architecture patterns for scalable, maintainable applications.

## When to Activate

- Building Django web applications
- Designing Django REST Framework APIs
- Working with Django ORM and models
- Setting up Django project structure
- Implementing caching, signals, middleware

## Project Structure

### Recommended Layout

```text
myproject/
├── config/
│   ├── __init__.py
│   ├── settings/
│   │   ├── __init__.py
│   │   ├── base.py          # Base settings
│   │   ├── development.py   # Dev settings
│   │   ├── production.py    # Production settings
│   │   └── test.py          # Test settings
│   ├── urls.py
│   ├── wsgi.py
│   └── asgi.py
├── manage.py
└── apps/
    ├── __init__.py
    ├── users/
    │   ├── __init__.py
    │   ├── models.py
    │   ├── views.py
    │   ├── serializers.py
    │   ├── urls.py
    │   ├── permissions.py
    │   ├── filters.py
    │   ├── services.py
    │   └── tests/
    └── products/
        └── ...
```

### Split Settings Pattern

```python
# config/settings/base.py
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

SECRET_KEY = env('DJANGO_SECRET_KEY')
DEBUG = False
ALLOWED_HOSTS = []

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    # Local apps
    'apps.users',
    'apps.products',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'
WSGI_APPLICATION = 'config.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': env('DB_NAME'),
        'USER': env('DB_USER'),
        'PASSWORD': env('DB_PASSWORD'),
        'HOST': env('DB_HOST'),
        'PORT': env('DB_PORT', default='5432'),
    }
}

# config/settings/development.py
from .base import *

DEBUG = True
ALLOWED_HOSTS = ['localhost', '127.0.0.1']

DATABASES['default']['NAME'] = 'myproject_dev'

INSTALLED_APPS += ['debug_toolbar']

MIDDLEWARE += ['debug_toolbar.middleware.DebugToolbarMiddleware']

EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# config/settings/production.py
from .base import *

DEBUG = False
ALLOWED_HOSTS = env.list('ALLOWED_HOSTS')
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'WARNING',
            'class': 'logging.FileHandler',
            'filename': '/var/log/django/django.log',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file'],
            'level': 'WARNING',
            'propagate': True,
        },
    },
}
```

## Model Design Patterns

### Model Best Practices

```python
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator

class User(AbstractUser):
    """Custom user model extending AbstractUser."""
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)
    birth_date = models.DateField(null=True, blank=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    class Meta:
        db_table = 'users'
        verbose_name = 'user'
        verbose_name_plural = 'users'
        ordering = ['-date_joined']

    def __str__(self):
        return self.email

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

class Product(models.Model):
    """Product model with proper field configuration."""
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True, max_length=250)
    description = models.TextField(blank=True)
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    stock = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    category = models.ForeignKey(
        'Category',
        on_delete=models.CASCADE,
        related_name='products'
    )
    tags = models.ManyToManyField('Tag', blank=True, related_name='products')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'products'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['-created_at']),
            models.Index(fields=['category', 'is_active']),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(price__gte=0),
                name='price_non_negative'
            )
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)
```

### QuerySet Best Practices

```python
from django.db import models

class ProductQuerySet(models.QuerySet):
    """Custom QuerySet for Product model."""

    def active(self):
        """Return only active products."""
        return self.filter(is_active=True)

    def with_category(self):
        """Select related category to avoid N+1 queries."""
        return self.select_related('category')

    def with_tags(self):
        """Prefetch tags for many-to-many relationship."""
        return self.prefetch_related('tags')

    def in_stock(self):
        """Return products with stock > 0."""
        return self.filter(stock__gt=0)

    def search(self, query):
        """Search products by name or description."""
        return self.filter(
            models.Q(name__icontains=query) |
            models.Q(description__icontains=query)
        )

class Product(models.Model):
    # ... fields ...

    objects = ProductQuerySet.as_manager()  # Use custom QuerySet

# Usage
Product.objects.active().with_category().in_stock()
```

### Manager Methods

```python
class ProductManager(models.Manager):
    """Custom manager for complex queries."""

    def get_or_none(self, **kwargs):
        """Return object or None instead of DoesNotExist."""
        try:
            return self.get(**kwargs)
        except self.model.DoesNotExist:
            return None

    def create_with_tags(self, name, price, tag_names):
        """Create product with associated tags."""
        product = self.create(name=name, price=price)
        tags = [Tag.objects.get_or_create(name=name)[0] for name in tag_names]
        product.tags.set(tags)
        return product

    def bulk_update_stock(self, product_ids, quantity):
        """Bulk update stock for multiple products."""
        return self.filter(id__in=product_ids).update(stock=quantity)

# In model
class Product(models.Model):
    # ... fields ...
    custom = ProductManager()
```

## Django REST Framework Patterns

### Serializer Patterns

```python
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import Product, User

class ProductSerializer(serializers.ModelSerializer):
    """Serializer for Product model."""

    category_name = serializers.CharField(source='category.name', read_only=True)
    average_rating = serializers.FloatField(read_only=True)
    discount_price = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'description', 'price',
            'discount_price', 'stock', 'category_name',
            'average_rating', 'created_at'
        ]
        read_only_fields = ['id', 'slug', 'created_at']

    def get_discount_price(self, obj):
        """Calculate discount price if applicable."""
        if hasattr(obj, 'discount') and obj.discount:
            return obj.price * (1 - obj.discount.percent / 100)
        return obj.price

    def validate_price(self, value):
        """Ensure price is non-negative."""
        if value < 0:
            raise serializers.ValidationError("Price cannot be negative.")
        return value

class ProductCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating products."""

    class Meta:
        model = Product
        fields = ['name', 'description', 'price', 'stock', 'category']

    def validate(self, data):
        """Custom validation for multiple fields."""
        if data['price'] > 10000 and data['stock'] > 100:
            raise serializers.ValidationError(
                "Cannot have high-value products with large stock."
            )
        return data

class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""

    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(write_only=True, style={'input_type': 'password'})

    class Meta:
        model = User
        fields = ['email', 'username', 'password', 'password_confirm']

    def validate(self, data):
        """Validate passwords match."""
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({
                "password_confirm": "Password fields didn't match."
            })
        return data

    def create(self, validated_data):
        """Create user with hashed password."""
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = User.objects.create(**validated_data)
        user.set_password(password)
        user.save()
        return user
```

### ViewSet Patterns

```python
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django_filters.rest_framework import DjangoFilterBackend
from .models import Product
from .serializers import ProductSerializer, ProductCreateSerializer
from .permissions import IsOwnerOrReadOnly
from .filters import ProductFilter
from .services import ProductService

class ProductViewSet(viewsets.ModelViewSet):
    """ViewSet for Product model."""

    queryset = Product.objects.select_related('category').prefetch_related('tags')
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = ProductFilter
    search_fields = ['name', 'description']
    ordering_fields = ['price', 'created_at', 'name']
    ordering = ['-created_at']

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'create':
            return ProductCreateSerializer
        return ProductSerializer

    def perform_create(self, serializer):
        """Save with user context."""
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['get'])
    def featured(self, request):
        """Return featured products."""
        featured = self.queryset.filter(is_featured=True)[:10]
        serializer = self.get_serializer(featured, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def purchase(self, request, pk=None):
        """Purchase a product."""
        product = self.get_object()
        service = ProductService()
        result = service.purchase(product, request.user)
        return Response(result, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_products(self, request):
        """Return products created by current user."""
        products = self.queryset.filter(created_by=request.user)
        page = self.paginate_queryset(products)
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)
```

### Custom Actions

```python
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_to_cart(request):
    """Add product to user cart."""
    product_id = request.data.get('product_id')
    quantity = request.data.get('quantity', 1)

    try:
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return Response(
            {'error': 'Product not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    cart, _ = Cart.objects.get_or_create(user=request.user)
    CartItem.objects.create(
        cart=cart,
        product=product,
        quantity=quantity
    )

    return Response({'message': 'Added to cart'}, status=status.HTTP_201_CREATED)
```

## Service Layer Pattern

```python
# apps/orders/services.py
from typing import Optional
from django.db import transaction
from .models import Order, OrderItem

class OrderService:
    """Service layer for order-related business logic."""

    @staticmethod
    @transaction.atomic
    def create_order(user, cart: Cart) -> Order:
        """Create order from cart."""
        order = Order.objects.create(
            user=user,
            total_price=cart.total_price
        )

        for item in cart.items.all():
            OrderItem.objects.create(
                order=order,
                product=item.product,
                quantity=item.quantity,
                price=item.product.price
            )

        # Clear cart
        cart.items.all().delete()

        return order

    @staticmethod
    def process_payment(order: Order, payment_data: dict) -> bool:
        """Process payment for order."""
        # Integration with payment gateway
        payment = PaymentGateway.charge(
            amount=order.total_price,
            token=payment_data['token']
        )

        if payment.success:
            order.status = Order.Status.PAID
            order.save()
            # Send confirmation email
            OrderService.send_confirmation_email(order)
            return True

        return False

    @staticmethod
    def send_confirmation_email(order: Order):
        """Send order confirmation email."""
        # Email sending logic
        pass
```

## Caching Strategies

### View-Level Caching

```python
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator

@method_decorator(cache_page(60 * 15), name='dispatch')  # 15 minutes
class ProductListView(generic.ListView):
    model = Product
    template_name = 'products/list.html'
    context_object_name = 'products'
```

### Template Fragment Caching

```django
{% load cache %}
{% cache 500 sidebar %}
    ... expensive sidebar content ...
{% endcache %}
```

### Low-Level Caching

```python
from django.core.cache import cache

def get_featured_products():
    """Get featured products with caching."""
    cache_key = 'featured_products'
    products = cache.get(cache_key)

    if products is None:
        products = list(Product.objects.filter(is_featured=True))
        cache.set(cache_key, products, timeout=60 * 15)  # 15 minutes

    return products
```

### QuerySet Caching

```python
from django.core.cache import cache

def get_popular_categories():
    cache_key = 'popular_categories'
    categories = cache.get(cache_key)

    if categories is None:
        categories = list(Category.objects.annotate(
            product_count=Count('products')
        ).filter(product_count__gt=10).order_by('-product_count')[:20])
        cache.set(cache_key, categories, timeout=60 * 60)  # 1 hour

    return categories
```

## Signals

### Signal Patterns

```python
# apps/users/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from .models import Profile

User = get_user_model()

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Create profile when user is created."""
    if created:
        Profile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    """Save profile when user is saved."""
    instance.profile.save()

# apps/users/apps.py
from django.apps import AppConfig

class UsersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.users'

    def ready(self):
        """Import signals when app is ready."""
        import apps.users.signals
```

## Middleware

### Custom Middleware

```python
# middleware/active_user_middleware.py
import time
from django.utils.deprecation import MiddlewareMixin

class ActiveUserMiddleware(MiddlewareMixin):
    """Middleware to track active users."""

    def process_request(self, request):
        """Process incoming request."""
        if request.user.is_authenticated:
            # Update last active time
            request.user.last_active = timezone.now()
            request.user.save(update_fields=['last_active'])

class RequestLoggingMiddleware(MiddlewareMixin):
    """Middleware for logging requests."""

    def process_request(self, request):
        """Log request start time."""
        request.start_time = time.time()

    def process_response(self, request, response):
        """Log request duration."""
        if hasattr(request, 'start_time'):
            duration = time.time() - request.start_time
            logger.info(f'{request.method} {request.path} - {response.status_code} - {duration:.3f}s')
        return response
```

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

## Quick Reference

| Pattern | Description |
|---------|-------------|
| Split settings | Separate dev/prod/test settings |
| Custom QuerySet | Reusable query methods |
| Service Layer | Business logic separation |
| ViewSet | REST API endpoints |
| Serializer validation | Request/response transformation |
| select_related | Foreign key optimization |
| prefetch_related | Many-to-many optimization |
| Cache first | Cache expensive operations |
| Signals | Event-driven actions |
| Middleware | Request/response processing |

Remember: Django provides many shortcuts, but for production applications, structure and organization matter more than concise code. Build for maintainability.

## When to Activate

- Setting up Django authentication and authorization
- Implementing user permissions and roles
- Configuring production security settings
- Reviewing Django application for security issues
- Deploying Django applications to production

## Core Security Settings

### Production Settings Configuration

```python
# settings/production.py
import os

DEBUG = False  # CRITICAL: Never use True in production

ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '').split(',')

# Security headers
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = 'DENY'

# HTTPS and Cookies
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SAMESITE = 'Lax'

# Secret key (must be set via environment variable)
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY')
if not SECRET_KEY:
    raise ImproperlyConfigured('DJANGO_SECRET_KEY environment variable is required')

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 12,
        }
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]
```

## Authentication

### Custom User Model

```python
# apps/users/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    """Custom user model for better security."""

    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)

    USERNAME_FIELD = 'email'  # Use email as username
    REQUIRED_FIELDS = ['username']

    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return self.email

# settings/base.py
AUTH_USER_MODEL = 'users.User'
```

### Password Hashing

```python
# Django uses PBKDF2 by default. For stronger security:
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.Argon2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher',
    'django.contrib.auth.hashers.BCryptSHA256PasswordHasher',
]
```

### Session Management

```python
# Session configuration
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'  # Or 'db'
SESSION_CACHE_ALIAS = 'default'
SESSION_COOKIE_AGE = 3600 * 24 * 7  # 1 week
SESSION_SAVE_EVERY_REQUEST = False
SESSION_EXPIRE_AT_BROWSER_CLOSE = False  # Better UX, but less secure
```

## Authorization

### Permissions

```python
# models.py
from django.db import models
from django.contrib.auth.models import Permission

class Post(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField()
    author = models.ForeignKey(User, on_delete=models.CASCADE)

    class Meta:
        permissions = [
            ('can_publish', 'Can publish posts'),
            ('can_edit_others', 'Can edit posts of others'),
        ]

    def user_can_edit(self, user):
        """Check if user can edit this post."""
        return self.author == user or user.has_perm('app.can_edit_others')

# views.py
from django.contrib.auth.mixins import LoginRequiredMixin, PermissionRequiredMixin
from django.views.generic import UpdateView

class PostUpdateView(LoginRequiredMixin, PermissionRequiredMixin, UpdateView):
    model = Post
    permission_required = 'app.can_edit_others'
    raise_exception = True  # Return 403 instead of redirect

    def get_queryset(self):
        """Only allow users to edit their own posts."""
        return Post.objects.filter(author=self.request.user)
```

### Custom Permissions

```python
# permissions.py
from rest_framework import permissions

class IsOwnerOrReadOnly(permissions.BasePermission):
    """Allow only owners to edit objects."""

    def has_object_permission(self, request, view, obj):
        # Read permissions allowed for any request
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions only for owner
        return obj.author == request.user

class IsAdminOrReadOnly(permissions.BasePermission):
    """Allow admins to do anything, others read-only."""

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_staff

class IsVerifiedUser(permissions.BasePermission):
    """Allow only verified users."""

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_verified
```

### Role-Based Access Control (RBAC)

```python
# models.py
from django.contrib.auth.models import AbstractUser, Group

class User(AbstractUser):
    ROLE_CHOICES = [
        ('admin', 'Administrator'),
        ('moderator', 'Moderator'),
        ('user', 'Regular User'),
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='user')

    def is_admin(self):
        return self.role == 'admin' or self.is_superuser

    def is_moderator(self):
        return self.role in ['admin', 'moderator']

# Mixins
class AdminRequiredMixin:
    """Mixin to require admin role."""

    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_authenticated or not request.user.is_admin():
            from django.core.exceptions import PermissionDenied
            raise PermissionDenied
        return super().dispatch(request, *args, **kwargs)
```

## SQL Injection Prevention

### Django ORM Protection

```python
# GOOD: Django ORM automatically escapes parameters
def get_user(username):
    return User.objects.get(username=username)  # Safe

# GOOD: Using parameters with raw()
def search_users(query):
    return User.objects.raw('SELECT * FROM users WHERE username = %s', [query])

# BAD: Never directly interpolate user input
def get_user_bad(username):
    return User.objects.raw(f'SELECT * FROM users WHERE username = {username}')  # VULNERABLE!

# GOOD: Using filter with proper escaping
def get_users_by_email(email):
    return User.objects.filter(email__iexact=email)  # Safe

# GOOD: Using Q objects for complex queries
from django.db.models import Q
def search_users_complex(query):
    return User.objects.filter(
        Q(username__icontains=query) |
        Q(email__icontains=query)
    )  # Safe
```

### Extra Security with raw()

```python
# If you must use raw SQL, always use parameters
User.objects.raw(
    'SELECT * FROM users WHERE email = %s AND status = %s',
    [user_input_email, status]
)
```

## XSS Prevention

### Template Escaping

```django
{# Django auto-escapes variables by default - SAFE #}
{{ user_input }}  {# Escaped HTML #}

{# Explicitly mark safe only for trusted content #}
{{ trusted_html|safe }}  {# Not escaped #}

{# Use template filters for safe HTML #}
{{ user_input|escape }}  {# Same as default #}
{{ user_input|striptags }}  {# Remove all HTML tags #}

{# JavaScript escaping #}
<script>
    var username = {{ username|escapejs }};
</script>
```

### Safe String Handling

```python
from django.utils.safestring import mark_safe
from django.utils.html import escape

# BAD: Never mark user input as safe without escaping
def render_bad(user_input):
    return mark_safe(user_input)  # VULNERABLE!

# GOOD: Escape first, then mark safe
def render_good(user_input):
    return mark_safe(escape(user_input))

# GOOD: Use format_html for HTML with variables
from django.utils.html import format_html

def greet_user(username):
    return format_html('<span class="user">{}</span>', escape(username))
```

### HTTP Headers

```python
# settings.py
SECURE_CONTENT_TYPE_NOSNIFF = True  # Prevent MIME sniffing
SECURE_BROWSER_XSS_FILTER = True  # Enable XSS filter
X_FRAME_OPTIONS = 'DENY'  # Prevent clickjacking

# Custom middleware
from django.conf import settings

class SecurityHeaderMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-XSS-Protection'] = '1; mode=block'
        response['Content-Security-Policy'] = "default-src 'self'"
        return response
```

## CSRF Protection

### Default CSRF Protection

```python
# settings.py - CSRF is enabled by default
CSRF_COOKIE_SECURE = True  # Only send over HTTPS
CSRF_COOKIE_HTTPONLY = True  # Prevent JavaScript access
CSRF_COOKIE_SAMESITE = 'Lax'  # Prevent CSRF in some cases
CSRF_TRUSTED_ORIGINS = ['https://example.com']  # Trusted domains

# Template usage
<form method="post">
    {% csrf_token %}
    {{ form.as_p }}
    <button type="submit">Submit</button>
</form>

# AJAX requests
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

fetch('/api/endpoint/', {
    method: 'POST',
    headers: {
        'X-CSRFToken': getCookie('csrftoken'),
        'Content-Type': 'application/json',
    },
    body: JSON.stringify(data)
});
```

### Exempting Views (Use Carefully)

```python
from django.views.decorators.csrf import csrf_exempt

@csrf_exempt  # Only use when absolutely necessary!
def webhook_view(request):
    # Webhook from external service
    pass
```

## File Upload Security

### File Validation

```python
import os
from django.core.exceptions import ValidationError

def validate_file_extension(value):
    """Validate file extension."""
    ext = os.path.splitext(value.name)[1]
    valid_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf']
    if not ext.lower() in valid_extensions:
        raise ValidationError('Unsupported file extension.')

def validate_file_size(value):
    """Validate file size (max 5MB)."""
    filesize = value.size
    if filesize > 5 * 1024 * 1024:
        raise ValidationError('File too large. Max size is 5MB.')

# models.py
class Document(models.Model):
    file = models.FileField(
        upload_to='documents/',
        validators=[validate_file_extension, validate_file_size]
    )
```

### Secure File Storage

```python
# settings.py
MEDIA_ROOT = '/var/www/media/'
MEDIA_URL = '/media/'

# Use a separate domain for media in production
MEDIA_DOMAIN = 'https://media.example.com'

# Don't serve user uploads directly
# Use whitenoise or a CDN for static files
# Use a separate server or S3 for media files
```

## API Security

### Rate Limiting

```python
# settings.py
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/day',
        'user': '1000/day',
        'upload': '10/hour',
    }
}

# Custom throttle
from rest_framework.throttling import UserRateThrottle

class BurstRateThrottle(UserRateThrottle):
    scope = 'burst'
    rate = '60/min'

class SustainedRateThrottle(UserRateThrottle):
    scope = 'sustained'
    rate = '1000/day'
```

### Authentication for APIs

```python
# settings.py
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}

# views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def protected_view(request):
    return Response({'message': 'You are authenticated'})
```

## Security Headers

### Content Security Policy

```python
# settings.py
CSP_DEFAULT_SRC = "'self'"
CSP_SCRIPT_SRC = "'self' https://cdn.example.com"
CSP_STYLE_SRC = "'self' 'unsafe-inline'"
CSP_IMG_SRC = "'self' data: https:"
CSP_CONNECT_SRC = "'self' https://api.example.com"

# Middleware
class CSPMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        response['Content-Security-Policy'] = (
            f"default-src {CSP_DEFAULT_SRC}; "
            f"script-src {CSP_SCRIPT_SRC}; "
            f"style-src {CSP_STYLE_SRC}; "
            f"img-src {CSP_IMG_SRC}; "
            f"connect-src {CSP_CONNECT_SRC}"
        )
        return response
```

## Environment Variables

### Managing Secrets

```python
# Use python-decouple or django-environ
import environ

env = environ.Env(
    # set casting, default value
    DEBUG=(bool, False)
)

# reading .env file
environ.Env.read_env()

SECRET_KEY = env('DJANGO_SECRET_KEY')
DATABASE_URL = env('DATABASE_URL')
ALLOWED_HOSTS = env.list('ALLOWED_HOSTS')

# .env file (never commit this)
DEBUG=False
SECRET_KEY=your-secret-key-here
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
ALLOWED_HOSTS=example.com,www.example.com
```

## Logging Security Events

```python
# settings.py
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'WARNING',
            'class': 'logging.FileHandler',
            'filename': '/var/log/django/security.log',
        },
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'django.security': {
            'handlers': ['file', 'console'],
            'level': 'WARNING',
            'propagate': True,
        },
        'django.request': {
            'handlers': ['file'],
            'level': 'ERROR',
            'propagate': False,
        },
    },
}
```

## Quick Security Checklist

| Check | Description |
|-------|-------------|
| `DEBUG = False` | Never run with DEBUG in production |
| HTTPS only | Force SSL, secure cookies |
| Strong secrets | Use environment variables for SECRET_KEY |
| Password validation | Enable all password validators |
| CSRF protection | Enabled by default, don't disable |
| XSS prevention | Django auto-escapes, don't use `&#124;safe` with user input |
| SQL injection | Use ORM, never concatenate strings in queries |
| File uploads | Validate file type and size |
| Rate limiting | Throttle API endpoints |
| Security headers | CSP, X-Frame-Options, HSTS |
| Logging | Log security events |
| Updates | Keep Django and dependencies updated |

Remember: Security is a process, not a product. Regularly review and update your security practices.

## Purpose

Principal-level Django architecture: app structure, settings split by environment, fat-model / thin-view layering, ORM optimisation (`select_related` / `prefetch_related`), DRF view + serializer patterns, middleware order, signals over inheritance, async views (Django 4+).

**Negative scope** (NOT what this skill covers):

- Django security configuration — see `django-patterns`
- Django test methodology — see `django-testing`
- Build / coverage / deployment gates — see `django-testing`
- Generic Python idioms — see `python-patterns`
- Generic Python testing — see `python-testing`

Principal-level Django security: SECRET_KEY rotation, auth (django.contrib.auth + django-allauth + OAuth2), CSRF posture, SQL injection prevention via ORM, XSS prevention in templates, file-upload safety, rate limiting (django-ratelimit), security headers, secrets management.

**Negative scope** (NOT what this skill covers):

- Django architecture / app structure — see `django-patterns`
- Test methodology (including security tests) — see `django-testing`
- Deployment / dependency CVE gates — see `django-testing`
- Cryptographic primitives at large — see `owasp-asvs`
- Frontend XSS / CSP — see `frontend-patterns`

## When NOT to use

- FastAPI / Starlette / Flask (different middleware + ASGI model)
- Pure REST API services (consider Django Ninja or FastAPI for less ORM coupling)
- High-throughput async event processors (Celery + FastAPI is leaner)

- Non-Django Python stacks (use FastAPI security patterns)
- Pure REST services (DRF token / OAuth — overlap but DRF-specific)

## Standards Cited

- **Django 5.1 Documentation** (`docs.djangoproject.com/en/5.1/`) — canonical reference
- **Django REST Framework 3.15** (`www.django-rest-framework.org/`) — DRF generic views, serializers
- **PEP 8 / PEP 257 / PEP 484 / PEP 695** — Python style + types
- **OWASP Top 10 2021** — A01-A10 mapping
- **OWASP ASVS 4.0.3 §1, §5, §13** — architecture + validation + API
- **Twelve-Factor App** — config via env, dependencies declared
- **RFC 7807 / RFC 9457 (Problem Details for HTTP APIs)** — DRF custom exception handlers
- **Two Scoops of Django 3.x (Greenfeld + Roy)** — community-canonical patterns

- **OWASP ASVS 4.0.3** — §2 (Auth), §3 (Session), §4 (Access), §5 (Validation), §7 (Errors), §13 (API)
- **OWASP Top 10 2021** — A01-A10
- **Django Security Reference** (`docs.djangoproject.com/en/5.1/topics/security/`) — built-in protections
- **RFC 6749 (OAuth 2.0)** + **RFC 7519 (JWT)** + **RFC 8725 (JWT BCP)** + **OpenID Connect Core 1.0**
- **NIST SP 800-63B** — password + MFA
- **OWASP CSRF Cheat Sheet** + **OWASP XSS Cheat Sheet**
- **CWE Top 25 (2026)** — CWE-79, CWE-89, CWE-287, CWE-352, CWE-862
- **django-allauth / django-axes / django-ratelimit** — community-canonical packages

## Anti-Patterns

| Pattern | Why bad | Correct alternative |
| --- | --- | --- |
| Business logic in views | Couples HTTP to domain; impossible to reuse from CLI / management command / Celery task | Service layer functions (or methods on model managers); views thin |
| Fat `Model.objects` chains in templates | N+1 queries on render | `select_related` for FK forward; `prefetch_related` for M2M / reverse FK |
| `Model.objects.filter(...).exists()` followed by `.get(...)` | Two queries; race window | Use `.first()` or `try/except DoesNotExist` |
| Inheriting from `models.Model` deep hierarchies | Multi-table inheritance generates JOINs on every query | Composition via OneToOne or `abstract = True` base |
| `signals` for cross-app side effects | Hidden coupling; hard to test | Explicit method calls in service functions; signals only for framework events |
| Settings without env split | Secrets in git; dev / prod drift | `settings/base.py` + `local.py` + `production.py`; secrets via env / `django-environ` |
| Custom middleware that doesn't call `get_response(request)` | Breaks chain silently | Always call `self.get_response(request)` and return its result |
| Sync DB calls in async view | Django warns + serialises through thread | `sync_to_async` wrapper OR fully async ORM (Django 5.1+ partial) |

| Pattern | Why bad | Correct alternative |
| --- | --- | --- |
| `SECRET_KEY` in `settings.py` | Source-code disclosure = session forgery | `os.environ["SECRET_KEY"]`; rotate via `django.core.signing.TimestampSigner` for in-flight sessions |
| `DEBUG = True` in prod | Stacktraces + settings leak | `DEBUG = False` + `ALLOWED_HOSTS`; checked in deploy gate |
| Raw SQL with string formatting | SQL injection | `Model.objects.raw("SELECT ... WHERE x = %s", [val])` parameterised; OR ORM |
| `safe` / `mark_safe` template filter on user input | XSS | Never `mark_safe(user_data)`; rely on Django's auto-escape |
| `csrf_exempt` on state-changing view | CSRF attack succeeds | Keep CSRF; for stateless API use DRF + token auth + `csrf_exempt` only on JSON endpoints validated by token |
| `User.objects.get(email=...)` without normalisation | Case-sensitive duplicate accounts | Custom UserManager with `email.lower()` + unique constraint |
| Storing password hashes via `make_password` without cost tuning | Default Argon2 OK; verify version + parallelism for hardware | Use latest `PASSWORD_HASHERS = ["django.contrib.auth.hashers.Argon2PasswordHasher"]` with reviewed cost |
| Direct file save from `request.FILES` | Path traversal + malicious file | Validate `FileExtensionValidator`, sanitise filename, use S3 + signed URLs |
| Sessions in DB without timeout | Session fixation | `SESSION_COOKIE_AGE` set; `SESSION_EXPIRE_AT_BROWSER_CLOSE = True` where applicable |

## Verification Checklist

- [ ] Views < 30 lines (business logic moved to services / managers)
- [ ] All FK / M2M accesses use `select_related` / `prefetch_related`
- [ ] Settings split per environment (`base`, `local`, `staging`, `production`)
- [ ] Secrets via env vars (django-environ); never in `settings.py`
- [ ] `DEBUG = False` in production with `ALLOWED_HOSTS` set
- [ ] CSRF middleware enabled (default); disabled only with documented stateless rationale
- [ ] Migrations atomic + reversible (per `schema-evolution.md`)
- [ ] Custom exception handler maps DRF exceptions to RFC 9457 envelope
- [ ] Async views use `sync_to_async` for ORM calls (Django 4-5.0) or native async ORM (5.1+)
- [ ] Logging configured with structured JSON output

- [ ] `SECRET_KEY` from env; rotation procedure documented
- [ ] `DEBUG = False` in production; verified in deploy gate
- [ ] CSRF middleware enabled (default); disabled only with documented rationale
- [ ] All queries use ORM or parameterised raw queries
- [ ] All templates rely on auto-escape; no `mark_safe(user_data)`
- [ ] Password hasher = Argon2 (django.contrib.auth.hashers.Argon2PasswordHasher)
- [ ] Rate limiting via `django-ratelimit` on auth + sensitive endpoints
- [ ] Security headers via `django.middleware.security.SecurityMiddleware` + CSP middleware
- [ ] HSTS preload-eligible: `SECURE_HSTS_SECONDS >= 31536000`, `SECURE_HSTS_PRELOAD = True`
- [ ] Dependency CVE scan green (`safety check` / `pip-audit`)
- [ ] django-axes installed for login throttling / lockout
- [ ] File uploads validated + stored on object store (S3) with signed URLs

## Cross-References

- `~/.claude/skills/django-patterns/SKILL.md` — auth + CSRF + SQL injection
- `~/.claude/skills/django-testing/SKILL.md` — pytest-django + factory_boy
- `~/.claude/skills/django-testing/SKILL.md` — migrations + coverage + deploy
- `~/.claude/skills/python-patterns/SKILL.md` — language idioms
- `~/.claude/skills/api-design/SKILL.md` — REST contract design
- `~/.claude/skills/observability-patterns/SKILL.md` — structured logs
- `~/.claude/rules-library/common/no-ambient-globals.md` — DI patterns in Django
- `~/.claude/agents/python-reviewer.md` — Django code review delegate

- `~/.claude/skills/django-patterns/SKILL.md` — architecture context
- `~/.claude/skills/owasp-asvs/SKILL.md` — full control catalogue
- `~/.claude/skills/gdpr-ccpa-compliance/SKILL.md` — privacy + consent
- `~/.claude/rules-library/common/secrets-management.md` — vault, not settings.py
- `~/.claude/rules-library/common/audit-logging.md` — security event log
- `~/.claude/rules-library/common/rate-limiting.md` — multi-layer rate limits
- `~/.claude/agents/security-reviewer.md` — Council Division 4
- `~/.claude/agents/compliance-reviewer.md` — Council Division 6

## Why this skill exists

Django's batteries-included approach makes prototypes fast but production-grade Django requires explicit discipline: settings split, service layers, ORM optimisation, async-DB-call awareness, env-driven config. The defaults are good for hello-world but break under load (N+1 queries, settings.py with secrets, untested signals). The patterns above codify the production-ready posture so Django apps survive load testing without rewriting the data access layer.

Django ships with sensible defaults (auto-escape, CSRF middleware, Argon2 hasher) — but the deploy step is where security regresses: `DEBUG = True` left on in staging-promoted-to-prod, `SECRET_KEY` checked into version control, `csrf_exempt` added "temporarily" and never removed, file-upload validators skipped. The verification checklist gates each of these mechanically so Django apps pass an OWASP ASVS L2 review on first audit.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- ORM N+1 pattern (query in template / loop) — `select_related` / `prefetch_related` weakening
- Fat view: business logic in view handler instead of service / model method (skinny-views weakening)
- Signal handler doing heavy lifting (move to Celery task or service layer)
- DRF serializer reading model instance with all fields when only a few are needed (over-fetch)
- `get_or_create` race condition (no unique constraint to back it up)
- Generic CBV used when explicit FBV would be clearer / more testable
- New app added without migrations / admin / tests scaffolding
- Settings.py with environment-specific values hardcoded (per `~/.claude/rules-library/common/no-ambient-globals.md`)
- Mixed sync/async views (calling sync ORM from async view causes thread-pool exhaustion)

**Refinement candidates**:

- New pattern row when a Django version ships new built-ins (e.g., async ORM, GeneratedField)
- New cross-reference when a sister skill (django-patterns, django-testing, jpa-patterns, postgres-patterns) adds a related pattern
- Tightening of the skinny-views rule when fat-view recurrence is observed
- New caching template when a new cache layer (Redis / per-view / per-fragment) becomes appropriate

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- View without `@login_required` / `LoginRequiredMixin` (broken access control — A01)
- Raw SQL via `cursor.execute` with string interpolation (SQL injection — A03)
- `mark_safe` / `|safe` on user-controlled HTML (XSS — A03)
- `CSRF_COOKIE_SECURE = False` or `SESSION_COOKIE_SECURE = False` in prod settings
- `DEBUG = True` reaching production (info disclosure)
- `SECRET_KEY` hardcoded in settings (Sonar S2068)
- `ALLOWED_HOSTS = ['*']` in production
- File upload via `FileField` without size + content-type validation
- Authentication endpoint without `django-ratelimit` / equivalent (A07)
- `urlopen` / `requests.get` on user-controlled URL without allowlist (SSRF — A10)
- Custom auth backend that doesn't extend Django's password hashers (weak crypto — A02)

**Refinement candidates**:

- New OWASP A01-A10 row when a recurring Django anti-pattern emerges
- New cross-reference when a sister skill (security-review, owasp-asvs, gdpr-ccpa-compliance) adds a Django-specific gate
- New `django-csp` / security middleware row when a new Django security library ships
- Tightening of the settings.py hardening checklist when a new vulnerability class surfaces
