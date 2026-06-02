# Dart / Flutter Patterns

> Auto-fires on every `*.dart`, `pubspec.yaml`, `pubspec.lock`,
> `analysis_options.yaml` file. Standards: **Effective Dart**
> (dart.dev/effective-dart), **Flutter Architecture Guide**,
> **Flutter Performance Best Practices**, **Material 3 / Cupertino
> design guidelines**.

## Core Principle

**Const-everywhere for widgets (every constructor that CAN be
const IS const); separate widget tree (build) from app state
(provider / Riverpod / BLoC / GetX); immutable models; Sound
null safety enforced; async via Future + Stream; never block the
event loop; widgets are cheap, rebuilds are cheap when state is
scoped.**

## Project layout

```
lib/
├── main.dart
├── src/
│   ├── app.dart                     # MaterialApp + routing
│   ├── domain/                      # Pure Dart, no Flutter imports
│   │   ├── models/
│   │   ├── repositories/            # interfaces only
│   │   └── usecases/
│   ├── data/                        # Flutter-free where possible
│   │   ├── repositories/            # implementations
│   │   ├── sources/
│   │   │   ├── remote/              # http client
│   │   │   └── local/               # sqflite / hive
│   │   └── dtos/
│   └── presentation/
│       ├── features/
│       │   └── orders/
│       │       ├── controller/
│       │       ├── views/
│       │       └── widgets/
│       └── shared/
└── test/
    └── ...
```

## State management — pick ONE per project

| Library | When to use |
| --- | --- |
| **Riverpod** | New projects (recommended; compile-safe, testable) |
| **BLoC / flutter_bloc** | Event-stream + state-stream paradigm; complex state machines |
| **Provider** | Older codebases; simple cases |
| **GetX** | Avoid — couples routing / state / DI; obscures dependency graph |
| **Redux** | Only if your team is from a Redux-heavy background |

Riverpod example:

```dart
@riverpod
class OrderController extends _$OrderController {
  @override
  Future<List<Order>> build() async {
    final repo = ref.read(orderRepositoryProvider);
    return repo.listAll();
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final repo = ref.read(orderRepositoryProvider);
      return repo.listAll();
    });
  }
}

// Widget consumes via Consumer or ConsumerWidget
class OrderListView extends ConsumerWidget {
  const OrderListView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final orders = ref.watch(orderControllerProvider);
    return orders.when(
      data: (data) => ListView(/* ... */),
      loading: () => const CircularProgressIndicator(),
      error: (e, st) => ErrorView(message: '$e'),
    );
  }
}
```

## Immutable models — `freezed`

```dart
@freezed
class Order with _$Order {
  const factory Order({
    required String id,
    required String customerId,
    required List<LineItem> items,
    required Money total,
    @Default(OrderStatus.pending) OrderStatus status,
  }) = _Order;

  factory Order.fromJson(Map<String, Object?> json) => _$OrderFromJson(json);
}
```

`freezed` generates: `==`, `hashCode`, `copyWith`, JSON
serialisation, sealed-union variants.

## Sealed unions for state

```dart
@freezed
sealed class OrderState with _$OrderState {
  const factory OrderState.loading() = OrderLoading;
  const factory OrderState.loaded(Order order) = OrderLoaded;
  const factory OrderState.error(String message) = OrderError;
}

// Exhaustive switch
String describe(OrderState state) => switch (state) {
  OrderLoading() => 'loading',
  OrderLoaded(:final order) => 'loaded ${order.id}',
  OrderError(:final message) => 'error: $message',
};
```

## Widget construction — const everywhere possible

```dart
// WRONG — rebuilds child every parent rebuild
class Parent extends StatelessWidget {
  const Parent({super.key});
  @override
  Widget build(BuildContext context) {
    return Container(
      child: Text('Hello'),     // not const
    );
  }
}

// RIGHT — const child = same instance every rebuild = no rebuild
class Parent extends StatelessWidget {
  const Parent({super.key});
  @override
  Widget build(BuildContext context) {
    return const Container(
      child: Text('Hello'),
    );
  }
}
```

Lint `prefer_const_constructors: error` enforces.

## Theme + design system

```dart
// theme/app_theme.dart
class AppTheme {
  static ThemeData light() => ThemeData(
    colorScheme: ColorScheme.fromSeed(seedColor: Colors.indigo),
    useMaterial3: true,
    textTheme: GoogleFonts.interTextTheme(),
  );

  static ThemeData dark() => ThemeData(
    colorScheme: ColorScheme.fromSeed(
      seedColor: Colors.indigo,
      brightness: Brightness.dark,
    ),
    useMaterial3: true,
    textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme),
  );
}

// Use semantic tokens, NEVER raw hex / RGB in widgets
Container(
  color: Theme.of(context).colorScheme.primary,
  child: Text(
    'Hello',
    style: Theme.of(context).textTheme.titleMedium,
  ),
)
```

## Routing

```dart
// go_router — the modern Flutter standard
final router = GoRouter(
  routes: [
    GoRoute(
      path: '/',
      builder: (ctx, state) => const HomeView(),
    ),
    GoRoute(
      path: '/orders/:id',
      builder: (ctx, state) => OrderView(id: state.pathParameters['id']!),
    ),
  ],
);
```

## Async patterns

```dart
// Always await Futures
Future<User> fetchUser(String id) async {
  final response = await http.get(Uri.parse('/users/$id'));
  if (response.statusCode != 200) {
    throw HttpException('user fetch failed: ${response.statusCode}');
  }
  return User.fromJson(jsonDecode(response.body));
}

// Cancellation via cancellation tokens (with cancellation_token package)
// or via http.Client.close() / StreamSubscription.cancel()

// Stream for incremental data
Stream<Order> watchOrders() async* {
  while (true) {
    final batch = await fetchBatch();
    for (final order in batch) yield order;
    await Future.delayed(const Duration(seconds: 5));
  }
}
```

## Reuse-first

| Use case | Library |
| --- | --- |
| State management | Riverpod, BLoC |
| HTTP client | Dio, http |
| JSON | dart:convert + json_serializable / freezed |
| Local storage | drift (SQLite), hive, isar |
| Network image cache | cached_network_image |
| Logging | logger, talker |
| DI | get_it, Riverpod (built-in) |
| Forms | flutter_form_builder, reactive_forms |
| Animations | Rive, Lottie |
| i18n | flutter_localizations + intl |
| Maps | google_maps_flutter, flutter_map |
| Push | firebase_messaging, OneSignal Flutter |
| Auth | firebase_auth, supabase_flutter, auth0 |
| Bottom sheets / modals | Flutter built-in (ModalBottomSheet, Dialog) |

Per `~/.claude/rules/common/reuse-first.md`.

## Performance

```dart
// Use ListView.builder for long lists (lazy)
ListView.builder(
  itemCount: items.length,
  itemBuilder: (ctx, i) => OrderTile(order: items[i]),
)

// const constructors prevent rebuild
// RepaintBoundary for isolated repaints
// Profile mode (flutter run --profile) before optimising
// flutter_inspector to find heavy widgets
```

## Cross-references

- `~/.claude/rules/common/patterns.md`
- `~/.claude/rules/common/reuse-first.md`
- `~/.claude/rules/dart/coding-style.md`
- `~/.claude/rules/dart/no-discards.md`
- `~/.claude/rules/dart/security.md`
- Effective Dart (dart.dev/effective-dart)
- Flutter Architecture (docs.flutter.dev/data-and-backend/state-mgmt/options)
- Riverpod docs (riverpod.dev)
- freezed (pub.dev/packages/freezed)
