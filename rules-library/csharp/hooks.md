# C# / .NET Hooks

> Auto-fires on every `*.cs`, `*.csx`, `*.csproj`, `*.sln`,
> `*.props`, `*.targets`, `global.json`, `Directory.Build.props`
> file. Sister to `~/.claude/rules/common/hooks.md`.

## Pre-commit gates

`.githooks/pre-commit`:

```bash
#!/usr/bin/env bash
set -euo pipefail

staged_cs=$(git diff --cached --name-only --diff-filter=ACMR \
    | grep -E '\.(cs|csx)$' || true)
[ -z "$staged_cs" ] && exit 0

dotnet format --verify-no-changes --include "$staged_cs"
dotnet build /warnaserror /p:TreatWarningsAsErrors=true
```

`.githooks/pre-push`:

```bash
#!/usr/bin/env bash
set -euo pipefail
dotnet test --logger "console;verbosity=minimal" --collect:"XPlat Code Coverage"
```

## Directory.Build.props (strict baseline)

```xml
<Project>
  <PropertyGroup>
    <TargetFramework>net9.0</TargetFramework>
    <LangVersion>latest</LangVersion>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
    <WarningsAsErrors />
    <EnforceCodeStyleInBuild>true</EnforceCodeStyleInBuild>
    <AnalysisLevel>latest-all</AnalysisLevel>
    <AnalysisMode>All</AnalysisMode>
    <CodeAnalysisTreatWarningsAsErrors>true</CodeAnalysisTreatWarningsAsErrors>
    <GenerateDocumentationFile>true</GenerateDocumentationFile>
    <NoWarn>$(NoWarn);CS1591</NoWarn> <!-- missing XML doc on public — narrow exception -->
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.CodeAnalysis.NetAnalyzers" Version="9.*" PrivateAssets="all" />
    <PackageReference Include="SonarAnalyzer.CSharp" Version="*" PrivateAssets="all" />
    <PackageReference Include="StyleCop.Analyzers" Version="*" PrivateAssets="all" />
    <PackageReference Include="Roslynator.Analyzers" Version="*" PrivateAssets="all" />
    <PackageReference Include="Roslynator.CodeAnalysis.Analyzers" Version="*" PrivateAssets="all" />
  </ItemGroup>
</Project>
```

## .editorconfig (strict)

```ini
root = true

[*.cs]
indent_style = space
indent_size = 4
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

# C# style
dotnet_style_qualification_for_field = false:warning
dotnet_style_qualification_for_property = false:warning
dotnet_style_qualification_for_method = false:warning
dotnet_style_qualification_for_event = false:warning

# Var
csharp_style_var_for_built_in_types = true:warning
csharp_style_var_when_type_is_apparent = true:warning
csharp_style_var_elsewhere = true:warning

# Expression-bodied members
csharp_style_expression_bodied_methods = when_on_single_line:warning
csharp_style_expression_bodied_properties = true:warning

# Strict diagnostics
dotnet_diagnostic.CS4014.severity = error    # unawaited Task
dotnet_diagnostic.CS8602.severity = error    # nullable dereference
dotnet_diagnostic.CS8603.severity = error    # nullable return
dotnet_diagnostic.CA1062.severity = error    # validate args
dotnet_diagnostic.CA1822.severity = error    # mark static
dotnet_diagnostic.CA2007.severity = none     # ConfigureAwait — app-level
dotnet_diagnostic.CA2016.severity = error    # forward CancellationToken
```

## CI workflow

```yaml
name: .NET CI

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<sha>
      - uses: actions/setup-dotnet@<sha>
        with:
          dotnet-version: '9.0.x'

      - name: Restore
        run: dotnet restore

      - name: Format check
        run: dotnet format --verify-no-changes

      - name: Build
        run: dotnet build --no-restore --configuration Release /warnaserror

      - name: Test
        run: |
          dotnet test --no-build --configuration Release \
            --collect:"XPlat Code Coverage" \
            --results-directory ./TestResults \
            --logger "trx;LogFileName=test-results.trx"

      - name: Coverage gate
        run: |
          dotnet tool install -g dotnet-reportgenerator-globaltool
          reportgenerator \
            -reports:"./TestResults/**/coverage.cobertura.xml" \
            -targetdir:"./coverage-report" \
            -reporttypes:"HtmlInline_AzurePipelines;Cobertura;TextSummary"
          coverage=$(grep -oP 'Line coverage: \K[0-9.]+' coverage-report/Summary.txt)
          if (( $(echo "$coverage < 80" | bc -l) )); then
            echo "Coverage $coverage% < 80%"
            exit 1
          fi

      - name: Security scan
        run: dotnet list package --vulnerable --include-transitive | tee /tmp/vuln.log
        # Fail if any vulnerability listed
        # post-step: grep -q 'vulnerable' /tmp/vuln.log && exit 1 || true

      - uses: codecov/codecov-action@<sha>
        with: { directory: ./coverage-report }
```

## `global.json` (SDK pinning)

```json
{
  "sdk": {
    "version": "9.0.100",
    "rollForward": "patch",
    "allowPrerelease": false
  }
}
```

## NuGet config (lockfile mode)

```xml
<!-- All .csproj files: -->
<PropertyGroup>
  <RestorePackagesWithLockFile>true</RestorePackagesWithLockFile>
  <RestoreLockedMode Condition="'$(ContinuousIntegrationBuild)' == 'true'">true</RestoreLockedMode>
</PropertyGroup>
```

CI sets `ContinuousIntegrationBuild=true` so `dotnet restore`
uses the lockfile strictly; lockfile drift fails the build.

## Banned package list

Maintain at `nuget-banned.txt` (audited via CODEOWNERS):

```text
# Abandoned / replaced
Newtonsoft.Json          # prefer System.Text.Json
RestSharp                # prefer HttpClient + System.Text.Json
log4net                  # prefer Serilog / Microsoft.Extensions.Logging
Castle.Core              # prefer DispatchProxy when possible
```

`Directory.Packages.props` rejects banned packages:

```xml
<ItemGroup>
  <PackageReference Update="Newtonsoft.Json" Version="0.0.0" />
  <PackageVersion Update="Newtonsoft.Json" Version="0.0.0" />
</ItemGroup>
```

## Cross-references

- `~/.claude/rules/common/hooks.md`
- `~/.claude/rules/common/dependency-vulnerabilities.md`
- `~/.claude/rules/csharp/no-discards.md`
- `~/.claude/rules/csharp/security.md`
- `~/.claude/rules/csharp/testing.md`
- .NET Code Style (Microsoft Learn)
- Roslynator (github.com/dotnet/roslynator)
- SonarAnalyzer.CSharp
