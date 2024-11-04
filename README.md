<div align="center">

<img alt="logo" src="./assets/eureka.svg" width="200px">

# Eureka

#### Universal Scratch extension loader

</div>

---

Eureka is a userscript which can load 3rd-party extensions in any Scratch-based editors (theoretically).

# ✨ Features

- [x] Sideload 3rd-party extensions in nearly-all Scratch-based editors
- [x] Safely for everyone - even those who don't installed Eureka
- [x] Extended Extension API
- [x] Friendly built-in dashboard

# 🔧 Compatibility

*Here's the refactored version of Eureka, Many platform still left untested. You can choose the legacy version (<= 8.1 >) of Eureka or open an issue for the compatibility problem you faced in those untested platforms!*

| Platform                        | Load extension manually | Conversion of sideloaded blocks | Load extension from eureka-ify projects | Extended Scratch context | No mixin conflicts |
|---------------------------------|-------------------------|---------------------------------|-----------------------------------------|--------------------------|--------------------|
| Scratch                         | ✅                       | ✅                               | ✅                                       | ✅                        | ✅                  |
| Scratch(Spork)                  | ✅                       | ✅                               | ✅                                       | ✅                        | ❓                  |
| Codingclip                      | ❓                       | ❓                               | ❓                                       | ❓                        | ❓                  |
| Cocrea                          | ✅                       | ❓                               | ❓                                       | ❓                        | ❓                  |
| Aerfaying (阿儿法营)             | ✅                       | ❓                               | ❓                                       | ❓                        | ❓                  |
| Co-Create World (共创世界)       | ✅                       | ❓                               | ❓                                       | ❓                        | ❓                  |
| Xiaomawang (小码王)              | ✅                       | ❓                               | ❓                                       | ❓                        | ❓                  |
| CodeLab                         | ✅                       | ❓                               | ❓                                       | ❓                        | ❓                  |
| 40code                          | ❓                       | ❓                               | ❓                                       | ❓                        | ❓                  |
| TurboWarp                       | ❓                       | ❓                               | ❓                                       | ❓                        | ❓                  |
| Xueersi (学而思)                | ❓                       | ❓                               | ❓                                       | ❓                        | ❓                  |
| Creaticode                      | ❓                       | ❓                               | ❓                                       | ❓                        | ❓                  |
| Adacraft                        | ❓                       | ❓                               | ❓                                       | ❓                        | ❓                  |
| PenguinMod                      | ❓                       | ❓                               | ❓                                       | ❓                        | ❓                  |
| ElectraMod                      | ❓                       | ❓                               | ❓                                       | ❓                        | ❓                  |
| XPLab                           | ❓                       | ❓                               | ❓                                       | ❓                        | ❓                  |

# 🧵 Why my extensions don't works?

Eureka is the glue that makes it all work by independently implementing a Scratch extension loading system in a non-sandboxed environment. But Eureka doesn't completely eliminate the problems that come with different environments - as a prime example, the extension tries to read either a vm or a blocks instance. If your extension doesn't work, check to see if the extension modifies something specific to the Scratch mod, and try to report it to the extension's author.

Translated with DeepL.com (free version)

# 📦 Installation

1. Install UserScript Manager like Tampermonkey or Violentmonkey.
2. Install Eureka from [Github Releases](https://github.com/EurekaScratch/eureka/releases).
3. Enjoy!

# ⚓ License

MIT, see [LICENSE](./LICENSE).
