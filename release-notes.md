#RELEASE NOTES:

## 2.1.1
- Intensive refactoring in this new release
- Now main functions are chainable
- promptAdventure was eliminated from the library and domAdventure was renamed startAdventure
- Fixed a bug that didn't allow to put a startAdventure interface into an html element container
- Now, for startAdventure, you choose if you want to use the default css styling or not in the options when the Aventura object is created (no need to pass a string with css when calling startAdventure)
- Not found rules in grammars are now logged in the console in error messages for better debugging
- testGrammar and testScenes can be used for debugging
- ¡Funciones equivalentes en inglés y en español!
- **BREAKING CHANGE**: Now setting new rules in grammar has the format: `$rule$[subrule:value]` instead of `$rule$<subrule:value>`
- It is now possible to add probabilities to grammar rules to affect how they are chosen by adding a property 'prob' to the rule array in the grammar object
-  **BREAKING CHANGE**: Now startAdventure supports redirection to more than two scenes from button options. Such options must be defined now in an array of objects
- Due to the latter change, there are not predefined scenes (like cover, intro, end, or credits). Scenes with a continue button can be created by passing a scene without options (as long as it has defined a subsequent scene). This allows for the creation of any of the former predefined scenes and it its a much more versatile structure.
- Grammars can now be easily used into the texts of scenes in Interactive Stories!
