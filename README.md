[简体中文](./README-zh_CN.md) | [日本語](./README-ja_JP.md) | EN

<div align="center">
 
<img alt="logo" src="./assets/eureka.svg" width="200px">

# Eureka
#### Universal Scratch extension loader 

</div> 
 
---
Visit the docs for more information.
Docs: [https://kokofixcomputers.gitbook.io/eureka-docs-unofficial/](https://kokofixcomputers.gitbook.io/eureka-docs-unofficial/) (also unofficial)

Eureka is a userscript which can load 3rd-party extensions in any Scratch-based editors (theoretically). 
This repo is a fork of the [original repo](https://github.com/EurekaScratch/eureka) and is intended to improve eureka.

**eh.... i kinda gave up mainiaining this :(**

# ✨ Features
- [x] Load Scratch standard extensions 
- [x] Unsandboxed extensions
- [x] TurboWarp Extension API (very small part)
- [x] Fallback solution for visitors without script installation
- [x] Load from editor
 
# 🌈 Supported platforms
- [x] Scratch (https://scratch.mit.edu/projects/*)
- [x] Codingclip (https://codingclip.com/*)
- [x] Cocrea (https://cocrea.world/*)
- [x] Aerfaying (阿儿法营) (https://aerfaying.com/Projects/*)
- [x] Co-Create World (共创世界) (https://cocrea.world/*)
- [x] Xiaomawang (小码王) (https://world.xiaomawang.com/*)
- [x] CodeLab (https://create.codelab.club/*)
- [x] 40code (https://www.40code.com/*)
- [x] TurboWarp (https://turbowarp.org/*)
- [x] Xueersi (学而思)
- [x] Creaticode
- [x] Adacraft (https://www.adacraft.org/*)
- [x] PenguinMod
- [x] ElectraMod * (https://electramod.vercel.app/*)
- [x] XPLab *

I have no idea which is which.... so please feel free to contribute too!

*\*: only available in ci builds*

# 🔥 Usage
1. Install UserScript Manager like Tampermonkey or Greasymonkey.
2. Open [release](https://github.com/kokofixcomputers/eureka/releases), Then click one release to install.
3. Find 'Open Frontend' button in 'My Blocks' category. you can sideload your extension by clicking it. You may have to wait 5 seconds to make the button appeared.

> Or... Due to editor differences, the button may not appear. There are other ways you can sideload extensions.   

1. Press 'F12' on your keyboard to open Developer Tools.
2. Input ``eureka.openFrontend()`` or ``eureka.loader.load([extensionURL], [load mode, like 'unsandboxed'])'`` In your console, then enter to execute.
3. Your extension got loaded!

More info on docs

# 🥰 Contribute extensions
Eureka's front-end provides an extension gallary where you can pick any extension you like. You are also welcome to contribute your own extensions to the gallary. For more information please visit [moth](https://github.com/EurekaScratch/moth) feel free to contribute to my repo or the original one

# ⚓ License
AGPL-3.0, see [LICENSE](./LICENSE).

# Supported Languages:
zh-cn
en
zh-Hant
ja
