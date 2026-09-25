# Full SonarJS catalog

> Covers every one of the 269 SonarJS rules: rule code, ESLint rule name, purpose, and default
> enablement under `sonarjs/recommended`. Pointed at by the SKILL.md row "Full SonarJS catalog".
>
> **Size budget: 36 KB** — `token-budget.mjs --check`.

## Full SonarJS catalog — every rule, all 269

Each entry: rule code · ESLint rule name · short purpose. The `recState` column shows the default
enablement under `sonarjs/recommended` (off = recommended disables it; that does NOT mean we should
leave it off — the IDE Sonar enables it).

| ID | ESLint rule | Description | recommended |
| ---- | ---- | ---- | ---- |
| **S100** | sonarjs/function-name | Function and method names should comply with a naming convention | off |
| **S101** | sonarjs/class-name | Class names should comply with a naming convention | error |
| **S104** | sonarjs/max-lines | Files should not have too many lines of code | off |
| **S105** | sonarjs/no-tab | Tabulation characters should not be used | off |
| **S117** | sonarjs/variable-name | Variable, property and parameter names should comply with a naming convention | off |
| **S124** | sonarjs/comment-regex | Track comments matching a regular expression | off |
| **S125** | sonarjs/no-commented-code | Sections of code should not be commented out | error |
| **S126** | sonarjs/elseif-without-else | "if ... else if" constructs should end with "else" clauses | off |
| **S128** | sonarjs/no-fallthrough | Switch cases should end with an unconditional "break" statement | error |
| **S134** | sonarjs/nested-control-flow | Control flow statements "if", "for", "while", "switch" and "try" should not be nested too deeply | off |
| **S135** | sonarjs/too-many-break-or-continue-in-loop | Loops should not contain more than a single "break" or "continue" statement | off |
| **S138** | sonarjs/max-lines-per-function | Functions should not have too many lines of code | off |
| **S881** | sonarjs/no-nested-incdec | Increment (++) and decrement (--) operators should not be used in a method call or mixed with other operators in an expression | off |
| **S888** | sonarjs/no-equals-in-for-termination | Equality operators should not be used in "for" loop termination conditions | error |
| **S930** | sonarjs/no-extra-arguments | Function calls should not pass extra arguments | error |
| **S1066** | sonarjs/no-collapsible-if | Mergeable "if" statements should be combined | off |
| **S1067** | sonarjs/expression-complexity | Expressions should not be too complex | off |
| **S1110** | sonarjs/no-redundant-parentheses | Redundant pairs of parentheses should be removed | off |
| **S1119** | sonarjs/no-labels | Labels should not be used | error |
| **S1121** | sonarjs/no-nested-assignment | Assignments should not be made from within sub-expressions | error |
| **S1125** | sonarjs/no-redundant-boolean | Boolean literals should not be used in comparisons | error |
| **S1126** | sonarjs/prefer-single-boolean-return | Return of boolean expressions should not be wrapped into an "if-then-else" statement | error |
| **S1128** | sonarjs/unused-import | Unnecessary imports should be removed | error |
| **S1134** | sonarjs/fixme-tag | Track uses of "FIXME" tags | error |
| **S1135** | sonarjs/todo-tag | Track uses of "TODO" tags | error |
| **S1154** | sonarjs/useless-string-operation | Results of operations on strings should not be ignored | off |
| **S1172** | sonarjs/no-unused-function-argument | Unused function parameters should be removed | off |
| **S1192** | sonarjs/no-duplicate-string | String literals should not be duplicated | off |
| **S1219** | sonarjs/no-case-label-in-switch | "switch" statements should not contain non-case labels | error |
| **S1226** | sonarjs/no-parameter-reassignment | Initial values of parameters, caught exceptions, and loop variables should not be ignored | error |
| **S1264** | sonarjs/prefer-while | A "while" loop should be used instead of a "for" loop | error |
| **S1291** | sonarjs/no-sonar-comments | Track uses of "NOSONAR" comments | off |
| **S1301** | sonarjs/no-small-switch | "if" statements should be preferred over "switch" when simpler | error |
| **S1313** | sonarjs/no-hardcoded-ip | IP addresses should not be hardcoded | error |
| **S1439** | sonarjs/label-position | Only "while", "do", "for" and "switch" statements should be labelled | error |
| **S1444** | sonarjs/public-static-readonly | Public "static" fields should be read-only | error |
| **S1451** | sonarjs/file-header | Track lack of copyright and license headers | off |
| **S1472** | sonarjs/call-argument-line | Function call arguments should not start on new lines | error |
| **S1479** | sonarjs/max-switch-cases | "switch" statements should not have too many "case" clauses | error |
| **S1481** | sonarjs/no-unused-vars | Unused local variables and functions should be removed | error |
| **S1488** | sonarjs/prefer-immediate-return | Local variables should not be declared and then immediately returned or thrown | off |
| **S1515** | sonarjs/function-inside-loop | Functions should not be defined inside loops | error |
| **S1523** | sonarjs/code-eval | Dynamically executing code is security-sensitive | error |
| **S1526** | sonarjs/no-variable-usage-before-declaration | Variables declared with "var" should be declared before they are used | off |
| **S1527** | sonarjs/future-reserved-words | Future reserved words should not be used as identifiers | error |
| **S1528** | sonarjs/array-constructor | Array constructors should not be used | off |
| **S1529** | sonarjs/bitwise-operators | Bitwise operators should not be used in boolean contexts | error |
| **S1530** | sonarjs/no-function-declaration-in-block | Function declarations should not be made within blocks | off |
| **S1533** | sonarjs/no-primitive-wrappers | Wrapper objects should not be used for primitive types | error |
| **S1535** | sonarjs/for-in | "for...in" loops should filter properties before acting on them | off |
| **S1541** | sonarjs/cyclomatic-complexity | Cyclomatic Complexity of functions should not be too high | off |
| **S1607** | sonarjs/no-skipped-tests | Tests should not be skipped without providing a reason | error |
| **S1764** | sonarjs/no-identical-expressions | Identical expressions should not be used on both sides of a binary operator | error |
| **S1821** | sonarjs/no-nested-switch | "switch" statements should not be nested | off |
| **S1848** | sonarjs/constructor-for-side-effects | Objects should not be created to be dropped immediately without being used | error |
| **S1854** | sonarjs/no-dead-store | Unused assignments should be removed | error |
| **S1862** | sonarjs/no-identical-conditions | "if/else if" chains and "switch" cases should not have the same condition | error |
| **S1871** | sonarjs/no-duplicated-branches | Two branches in a conditional structure should not have exactly the same implementation | error |
| **S1874** | sonarjs/deprecation | Deprecated APIs should not be used | error |
| **S1940** | sonarjs/no-inverted-boolean-check | Boolean checks should not be inverted | error |
| **S1994** | sonarjs/misplaced-loop-counter | "for" loop increment clauses should modify the loops' counters | error |
| **S2004** | sonarjs/no-nested-functions | Functions should not be nested too deeply | error |
| **S2068** | sonarjs/no-hardcoded-passwords | Credentials should not be hard-coded | error |
| **S2077** | sonarjs/sql-queries | Formatting SQL queries is security-sensitive | error |
| **S2092** | sonarjs/insecure-cookie | Cookies should have the "secure" flag | error |
| **S2123** | sonarjs/no-useless-increment | Values should not be uselessly incremented | error |
| **S2137** | sonarjs/no-globals-shadowing | Special identifiers should not be bound or assigned | error |
| **S2138** | sonarjs/no-undefined-assignment | "undefined" should not be assigned | off |
| **S2187** | sonarjs/no-empty-test-file | Test files should contain at least one test case | error |
| **S2201** | sonarjs/no-ignored-return | Return values from functions without side effects should not be ignored | error |
| **S2208** | sonarjs/no-wildcard-import | Wildcard imports should not be used | off |
| **S2234** | sonarjs/arguments-order | Parameters should be passed in the correct order | error |
| **S2245** | sonarjs/pseudo-random | Using pseudorandom number generators (PRNGs) is security-sensitive | error |
| **S2251** | sonarjs/for-loop-increment-sign | A "for" loop update clause should move the counter in the right direction | error |
| **S2255** | sonarjs/cookies | Writing cookies is security-sensitive | off |
| **S2259** | sonarjs/null-dereference | Properties of variables with "null" or "undefined" values should not be accessed | error |
| **S2301** | sonarjs/no-selector-parameter | Methods should not contain selector parameters | error |
| **S2310** | sonarjs/updated-loop-counter | Loop counters should not be assigned within the loop body | error |
| **S2392** | sonarjs/block-scoped-var | Variables should be used in the blocks where they are declared | error |
| **S2424** | sonarjs/no-built-in-override | Built-in objects should not be overridden | off |
| **S2428** | sonarjs/prefer-object-literal | Object literal syntax should be used | off |
| **S2486** | sonarjs/no-ignored-exceptions | Exceptions should not be ignored | error |
| **S2589** | sonarjs/no-gratuitous-expressions | Boolean expressions should not be gratuitous | error |
| **S2598** | sonarjs/file-uploads | File uploads should be restricted | error |
| **S2612** | sonarjs/file-permissions | File permissions should not be set to world-accessible values | error |
| **S2639** | sonarjs/no-empty-character-class | Empty character classes should not be used | error |
| **S2681** | sonarjs/no-unenclosed-multiline-block | Multiline blocks should be enclosed in curly braces | error |
| **S2692** | sonarjs/index-of-compare-to-positive-number | "indexOf" checks should not be for positive numbers | error |
| **S2699** | sonarjs/assertions-in-tests | Tests should include assertions | error |
| **S2703** | sonarjs/no-implicit-global | Variables should be declared explicitly | error |
| **S2737** | sonarjs/no-useless-catch | "catch" clauses should do more than rethrow | error |
| **S2755** | sonarjs/xml-parser-xxe | XML parsers should not be vulnerable to XXE attacks | error |
| **S2757** | sonarjs/non-existent-operator | Non-existent operators '=+', '=-' and '=!' should not be used | error |
| **S2817** | sonarjs/web-sql-database | Web SQL databases should not be used | off |
| **S2819** | sonarjs/post-message | Origins should be verified during cross-origin communications | error |
| **S2870** | sonarjs/no-array-delete | "delete" should not be used on arrays | error |
| **S2871** | sonarjs/no-alphabetical-sort | "Array.prototype.sort()" and "Array.prototype.toSorted()" should use a compare function | error |
| **S2970** | sonarjs/no-incomplete-assertions | Assertions should be complete | error |
| **S2990** | sonarjs/no-global-this | The global "this" object should not be used | error |
| **S2999** | sonarjs/new-operator-misuse | "new" should only be used with functions and classes | error |
| **S3001** | sonarjs/no-delete-var | "delete" should be used only with object properties | error |
| **S3003** | sonarjs/strings-comparison | Comparison operators should not be used with strings | off |
| **S3317** | sonarjs/file-name-differ-from-class | Default export names and file names should match | off |
| **S3330** | sonarjs/cookie-no-httponly | Creating cookies without the "HttpOnly" flag is security-sensitive | error |
| **S3358** | sonarjs/no-nested-conditional | Ternary operators should not be nested | error |
| **S3402** | sonarjs/no-incorrect-string-concat | Strings and non-strings should not be added | off |
| **S3403** | sonarjs/different-types-comparison | Strict equality operators should not be used with dissimilar types | error |
| **S3415** | sonarjs/inverted-assertion-arguments | Assertion arguments should be passed in the correct order | error |
| **S3499** | sonarjs/shorthand-property-grouping | Shorthand object properties should be grouped at the beginning or end of an object declaration | off |
| **S3500** | sonarjs/updated-const-var | "const" variables should not be reassigned | error |
| **S3513** | sonarjs/arguments-usage | "arguments" should not be accessed directly | off |
| **S3514** | sonarjs/destructuring-assignment-syntax | Destructuring syntax should be used for assignments | off |
| **S3516** | sonarjs/no-invariant-returns | Function returns should not be invariant | error |
| **S3524** | sonarjs/arrow-function-convention | Braces and parentheses should be used consistently with arrow functions | off |
| **S3525** | sonarjs/class-prototype | Class methods should be used instead of "prototype" assignments | off |
| **S3531** | sonarjs/generator-without-yield | Generators should explicitly "yield" a value | error |
| **S3533** | sonarjs/no-require-or-define | "import" should be used to include external code | off |
| **S3579** | sonarjs/no-associative-arrays | Array indexes should be numeric | error |
| **S3616** | sonarjs/comma-or-logical-or-case | Comma and logical OR operators should not be used in switch cases | error |
| **S3626** | sonarjs/no-redundant-jump | Jump statements should not be redundant | error |
| **S3686** | sonarjs/inconsistent-function-call | Functions should be called consistently with or without "new" | error |
| **S3699** | sonarjs/no-use-of-empty-return-value | The return value of void functions should not be used | error |
| **S3735** | sonarjs/void-use | "void" should not be used | error |
| **S3757** | sonarjs/operation-returning-nan | Arithmetic operations should not result in "NaN" | off |
| **S3758** | sonarjs/values-not-convertible-to-numbers | Values not convertible to numbers should not be used in numeric comparisons | off |
| **S3760** | sonarjs/non-number-in-arithmetic-expression | Arithmetic operators should only have numbers as operands | off |
| **S3776** | sonarjs/cognitive-complexity | Cognitive Complexity of functions should not be too high | error |
| **S3782** | sonarjs/argument-type | Arguments to built-in functions should match documented types | error |
| **S3785** | sonarjs/in-operator-type-error | "in" should not be used with primitive types | error |
| **S3796** | sonarjs/array-callback-without-return | Callbacks of array methods should have return statements | error |
| **S3798** | sonarjs/declarations-in-global-scope | Variables and functions should not be declared in the global scope | off |
| **S3800** | sonarjs/function-return-type | Functions should always return the same type | error |
| **S3801** | sonarjs/no-inconsistent-returns | Functions should use "return" consistently | off |
| **S3827** | sonarjs/no-reference-error | Variables should be defined before being used | off |
| **S3923** | sonarjs/no-all-duplicated-branches | All branches in a conditional structure should not have exactly the same implementation | error |
| **S3972** | sonarjs/no-same-line-conditional | Conditionals should start on new lines | error |
| **S3973** | sonarjs/conditional-indentation | A conditionally executed single line should be denoted by indentation | off |
| **S3981** | sonarjs/no-collection-size-mischeck | Collection size and array length comparisons should make sense | error |
| **S3984** | sonarjs/no-unthrown-error | Errors should not be created without being thrown | error |
| **S4030** | sonarjs/no-unused-collection | Collection contents should be used | error |
| **S4036** | sonarjs/no-os-command-from-path | Searching OS commands in PATH is security-sensitive | error |
| **S4043** | sonarjs/no-misleading-array-reverse | Array-mutating methods should not be used misleadingly | error |
| **S4139** | sonarjs/no-for-in-iterable | "for in" should not be used with iterables | off |
| **S4143** | sonarjs/no-element-overwrite | Collection elements should not be replaced unconditionally | error |
| **S4144** | sonarjs/no-identical-functions | Functions should not have identical implementations | error |
| **S4158** | sonarjs/no-empty-collection | Empty collections should not be accessed or iterated | error |
| **S4165** | sonarjs/no-redundant-assignments | Assignments should not be redundant | error |
| **S4322** | sonarjs/prefer-type-guard | Type predicates should be used | error |
| **S4323** | sonarjs/use-type-alias | Type aliases should be used | error |
| **S4324** | sonarjs/no-return-type-any | Primitive return types should be used | off |
| **S4328** | sonarjs/no-implicit-dependencies | Dependencies should be explicit | off |
| **S4335** | sonarjs/no-useless-intersection | Type intersections should use meaningful types | error |
| **S4423** | sonarjs/weak-ssl | Weak SSL/TLS protocols should not be used | error |
| **S4426** | sonarjs/no-weak-keys | Cryptographic keys should be robust | error |
| **S4502** | sonarjs/csrf | Disabling CSRF protections is security-sensitive | error |
| **S4507** | sonarjs/production-debug | Delivering code in production with debug features activated is security-sensitive | error |
| **S4524** | sonarjs/prefer-default-last | "default" clauses should be last | error |
| **S4619** | sonarjs/no-in-misuse | "in" should not be used on arrays | error |
| **S4621** | sonarjs/no-duplicate-in-composite | Union and intersection types should not include duplicated constituents | error |
| **S4622** | sonarjs/max-union-size | Union types should not have too many elements | off |
| **S4623** | sonarjs/no-undefined-argument | "undefined" should not be passed as the value of optional parameters | error |
| **S4624** | sonarjs/no-nested-template-literals | Template literals should not be nested | error |
| **S4634** | sonarjs/prefer-promise-shorthand | Shorthand promises should be used | error |
| **S4721** | sonarjs/os-command | Using shell interpreter when executing OS commands is security-sensitive | error |
| **S4782** | sonarjs/no-redundant-optional | Optional property declarations should not use both '?' and 'undefined' syntax | error |
| **S4784** | sonarjs/regular-expr | Using regular expressions is security-sensitive | off |
| **S4787** | sonarjs/encryption | Encrypting data is security-sensitive | off |
| **S4790** | sonarjs/hashing | Using weak hashing algorithms is security-sensitive | error |
| **S4798** | sonarjs/bool-param-default | Optional boolean parameters should have default value | off |
| **S4817** | sonarjs/xpath | Executing XPath expressions is security-sensitive | off |
| **S4818** | sonarjs/sockets | Using Sockets is security-sensitive | off |
| **S4822** | sonarjs/no-try-promise | Promise rejections should not be caught by "try" blocks | error |
| **S4823** | sonarjs/process-argv | Using command line arguments is security-sensitive | off |
| **S4829** | sonarjs/standard-input | Reading the Standard Input is security-sensitive | off |
| **S4830** | sonarjs/unverified-certificate | Server certificates should be verified during SSL/TLS connections | error |
| **S5042** | sonarjs/no-unsafe-unzip | Expanding archive files should not be done without controlling resource consumption | off |
| **S5122** | sonarjs/cors | Cross-Origin Resource Sharing (CORS) policy should be restricted to trusted origins | error |
| **S5148** | sonarjs/link-with-target-blank | Opened windows should not have access to the originating page | error |
| **S5247** | sonarjs/disabled-auto-escaping | Disabling auto-escaping in template engines is security-sensitive | error |
| **S5256** | sonarjs/table-header | Tables should have headers | error |
| **S5257** | sonarjs/no-table-as-layout | HTML `<table>` should not be used for layout purposes | error |
| **S5260** | sonarjs/table-header-reference | Table cells should reference their headers | error |
| **S5264** | sonarjs/object-alt-content | "`<object>`" tags should provide an alternative content | error |
| **S5332** | sonarjs/no-clear-text-protocols | Using clear-text protocols is security-sensitive | error |
| **S5443** | sonarjs/publicly-writable-directories | Temporary files should not be created in publicly writable directories | error |
| **S5527** | sonarjs/unverified-hostname | Server hostnames should be verified during SSL/TLS connections | error |
| **S5542** | sonarjs/encryption-secure-mode | Encryption algorithms should be used with secure mode and padding scheme | error |
| **S5547** | sonarjs/no-weak-cipher | Cipher algorithms should be robust | error |
| **S5604** | sonarjs/no-intrusive-permissions | Using intrusive permissions is security-sensitive | error |
| **S5659** | sonarjs/insecure-jwt-token | JWT should be signed and verified with strong cipher algorithms | error |
| **S5689** | sonarjs/x-powered-by | Web application technologies should not disclose version information | error |
| **S5691** | sonarjs/hidden-files | Statically serving hidden files is security-sensitive | error |
| **S5693** | sonarjs/content-length | HTTP request content length should be limited | error |
| **S5725** | sonarjs/disabled-resource-integrity | Using remote artifacts without integrity checks is security-sensitive | error |
| **S5728** | sonarjs/content-security-policy | Disabling content security policy fetch directives is security-sensitive | error |
| **S5730** | sonarjs/no-mixed-content | Allowing mixed-content is security-sensitive | error |
| **S5732** | sonarjs/frame-ancestors | Disabling content security policy frame-ancestors directive is security-sensitive | error |
| **S5734** | sonarjs/no-mime-sniff | Allowing browsers to sniff MIME types is security-sensitive | error |
| **S5736** | sonarjs/no-referrer-policy | Disabling strict HTTP no-referrer policy is security-sensitive | error |
| **S5739** | sonarjs/strict-transport-security | Disabling Strict-Transport-Security policy is security-sensitive | error |
| **S5742** | sonarjs/certificate-transparency | Disabling Certificate Transparency monitoring is security-sensitive | off |
| **S5743** | sonarjs/dns-prefetching | Allowing browsers to perform DNS prefetching is security-sensitive | off |
| **S5757** | sonarjs/confidential-information-logging | Allowing confidential information to be logged is security-sensitive | error |
| **S5759** | sonarjs/no-ip-forward | Forwarding client IP address is security-sensitive | error |
| **S5842** | sonarjs/empty-string-repetition | Repeated patterns in regular expressions should not match the empty string | error |
| **S5843** | sonarjs/regex-complexity | Regular expressions should not be too complicated | error |
| **S5850** | sonarjs/anchor-precedence | Alternatives in regular expressions should be grouped when used with anchors | error |
| **S5852** | sonarjs/slow-regex | Using slow regular expressions is security-sensitive | error |
| **S5856** | sonarjs/no-invalid-regexp | Regular expressions should be syntactically valid | error |
| **S5860** | sonarjs/unused-named-groups | Names of regular expressions named groups should be used | error |
| **S5863** | sonarjs/no-same-argument-assert | Assertions should not be given twice the same argument | error |
| **S5867** | sonarjs/unicode-aware-regex | Regular expressions using Unicode character classes or property escapes should enable the unicode flag | off |
| **S5868** | sonarjs/no-misleading-character-class | Unicode Grapheme Clusters should be avoided inside regex character classes | error |
| **S5869** | sonarjs/duplicates-in-character-class | Character classes in regular expressions should not contain the same character twice | error |
| **S5876** | sonarjs/session-regeneration | A new session should be created during user authentication | error |
| **S5958** | sonarjs/test-check-exception | Tests should check which exception is thrown | error |
| **S5973** | sonarjs/stable-tests | Tests should be stable | error |
| **S6019** | sonarjs/no-empty-after-reluctant | Reluctant quantifiers in regular expressions should be followed by an expression that can't match the empty string | error |
| **S6035** | sonarjs/single-character-alternation | Single-character alternations in regular expressions should be replaced with character classes | error |
| **S6079** | sonarjs/no-code-after-done | Tests should not execute any code after "done()" is called | error |
| **S6080** | sonarjs/disabled-timeout | Disabling Mocha timeouts should be explicit | error |
| **S6092** | sonarjs/chai-determinate-assertion | Chai assertions should have only one reason to succeed | error |
| **S6245** | sonarjs/aws-s3-bucket-server-encryption | Disabling server-side encryption of S3 buckets is security-sensitive | off |
| **S6249** | sonarjs/aws-s3-bucket-insecure-http | Authorizing HTTP communications with S3 buckets is security-sensitive | error |
| **S6252** | sonarjs/aws-s3-bucket-versioning | Disabling versioning of S3 buckets is security-sensitive | error |
| **S6265** | sonarjs/aws-s3-bucket-granted-access | S3 buckets should not grant access to all users or authenticated users | error |
| **S6268** | sonarjs/no-angular-bypass-sanitization | Disabling Angular built-in sanitization is security-sensitive | error |
| **S6270** | sonarjs/aws-iam-public-access | AWS resource-based policies should not grant public access | error |
| **S6275** | sonarjs/aws-ec2-unencrypted-ebs-volume | EBS volumes should be encrypted | error |
| **S6281** | sonarjs/aws-s3-bucket-public-access | Allowing public ACLs or policies on a S3 bucket is security-sensitive | error |
| **S6299** | sonarjs/no-vue-bypass-sanitization | Disabling Vue.js built-in escaping is security-sensitive | off |
| **S6302** | sonarjs/aws-iam-all-privileges | Policies should not grant all privileges | error |
| **S6303** | sonarjs/aws-rds-unencrypted-databases | Amazon RDS resources should be encrypted at rest | error |
| **S6304** | sonarjs/aws-iam-all-resources-accessible | Policies granting access to all resources of an account are security-sensitive | off |
| **S6308** | sonarjs/aws-opensearchservice-domain | OpenSearch domains should have encryption at rest enabled | error |
| **S6317** | sonarjs/aws-iam-privilege-escalation | AWS IAM policies should limit the scope of permissions given | error |
| **S6319** | sonarjs/aws-sagemaker-unencrypted-notebook | Using unencrypted SageMaker notebook instances is security-sensitive | error |
| **S6321** | sonarjs/aws-restricted-ip-admin-access | Administration services access should be restricted to specific IP addresses | error |
| **S6323** | sonarjs/no-empty-alternatives | Alternation in regular expressions should not contain empty alternatives | error |
| **S6324** | sonarjs/no-control-regex | Regular expressions should not contain control characters | error |
| **S6326** | sonarjs/no-regex-spaces | Regular expressions should not contain multiple spaces | error |
| **S6327** | sonarjs/aws-sns-unencrypted-topics | Using unencrypted SNS topics is security-sensitive | error |
| **S6328** | sonarjs/existing-groups | Replacement strings should reference existing regular expression groups | error |
| **S6329** | sonarjs/aws-ec2-rds-dms-public | Allowing public network access to cloud resources is security-sensitive | error |
| **S6330** | sonarjs/aws-sqs-unencrypted-queue | SQS queues should be encrypted | error |
| **S6331** | sonarjs/no-empty-group | Regular expressions should not contain empty groups | error |
| **S6332** | sonarjs/aws-efs-unencrypted | Using unencrypted EFS file systems is security-sensitive | error |
| **S6333** | sonarjs/aws-apigateway-public-api | Creating public APIs is security-sensitive | error |
| **S6351** | sonarjs/stateful-regex | Regular expressions with the global flag should be used with caution | error |
| **S6353** | sonarjs/concise-regex | Regular expression quantifiers and character classes should be used concisely | error |
| **S6397** | sonarjs/single-char-in-character-classes | Character classes in regular expressions should not contain only one character | error |
| **S6418** | sonarjs/no-hardcoded-secrets | Secrets should not be hard-coded | error |
| **S6426** | sonarjs/no-exclusive-tests | Exclusive tests should not be committed to version control | error |
| **S6437** | sonarjs/hardcoded-secret-signatures | Credentials should not be hard-coded | error |
| **S6439** | sonarjs/jsx-no-leaked-render | React components should not render non-boolean condition values | error |
| **S6442** | sonarjs/no-hook-setter-in-body | React's useState hook should not be used directly in the render function or body of a component | error |
| **S6443** | sonarjs/no-useless-react-setstate | React state setter function should not be called with its matching state variable | error |
| **S6486** | sonarjs/no-uniq-key | JSX list components keys should match up between renders | error |
| **S6564** | sonarjs/redundant-type-aliases | Redundant type aliases should not be used | error |
| **S6594** | sonarjs/prefer-regexp-exec | "RegExp.exec()" should be preferred over "String.match()" | error |
| **S6627** | sonarjs/no-internal-api-use | Users should not use internal APIs | error |
| **S6759** | sonarjs/prefer-read-only-props | React props should be read-only | error |
| **S6958** | sonarjs/no-literal-call | Literals should not be used as functions | error |
| **S6959** | sonarjs/reduce-initial-value | "Array.reduce()" calls should include an initial value | error |
| **S7059** | sonarjs/no-async-constructor | Constructors should not contain asynchronous operations | error |
| **S7639** | sonarjs/review-blockchain-mnemonic | Wallet phrases should not be hard-coded | error |
| **S7790** | sonarjs/dynamically-constructed-templates | Templates should not be constructed dynamically | error |
| **S8441** | sonarjs/no-session-cookies-on-static-assets | Static Assets should not serve session cookies | error |
| **S8479** | sonarjs/dompurify-unsafe-config | DOMPurify configuration should not be bypassable | error |
