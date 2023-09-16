#RELEASE NOTES:

## 2.5.0
- Added the capability to create three types of visualizations, useful for including interactive panels into aventura: compare, scatter and circle pack.
- For making the visualizations, now there is a `setDataScenes` function that accepts a second argument, `data`, with an array of objects containing datapoints. This new functionality adds some image processing time to the `setDataScenes` function, so, unlike the regular `setScenes`, it is an async function.
- When `data` is passed to `setDataScenes`, Aventura will create a scene for each one of the datapoints. Each datapoint must have and id with the key "ID", and optionally a text content ("CONT") and an image url ("IMGURL").
- with `setDataScenes` you can also include a third argument, `meta`. This argument receives an array of strings with keys present in the data list. If the parameter meta is included in a scene, with a value corresponding to the id of a datapoint, the interface of Aventura will present the data of the keys included in the meta argument of `setDataScenes`.
- Added the `vizWidth: 1000` and `vizHeight: 1000` for determining the sizes of visualizations, and `vizCol: "black"` and `vizBg: "#313131"` for determining its stroke and background color. Added the `urlWord: "URL"` option to set a keyword for URLs that take to external content. Added the `vizLoading: true` to toggle between showing a loading screen or not.
- Added the `adventureSlide` option (default: `true`), so it's possible to decide if the interactive will scroll into view after a new scene is rendered. Disabling this option is useful to avoid conflicts when Aventura is embedded in other frameworks, like ObservableHQ.
- Added the `evalTags` option (default: `false`). Now HTML tags are not evaluated by default from the text content of interactive scenes (as a security measure). If you need that functionality, you can assign`true` to `evalTags`.

## 2.4.1
- Added divs to different parts of the interactive story: image or igrama is contained in `storyimage-container`, paragraph is contained in `storyp-container`, and buttons are contained in `storybutton-container`
- Added a scrolling option, useful for web comics or for stories that require keeping the previously visited scenes. Activate it by setting to true the parameter `adventureScroll` in the Aventura options. (Additionally, it clones the img nodes when this option is activated so the image does not get moved from one scene to another when the same scene is repeated)
- Added the `plop` parameter in scenes. When true, the scrolling is reset and display of previous scenes is removed.
- Changed storydiv id to a class name **(This could affect stories made with previous versions)**
- Changed the parameter to set inner text from `text` of area to `btn` to be consistent with the conventions of buttons
- Improved CSS styling of interactive stories
- MiniGif must be loaded separately
- Added the parameter `minigifOptions` in the options of Aventura
- Updated documentation!

## 2.3.6
- Added a sceneCallback functionality, which returns the actual scene being shown and can be used to add custom code to scenes
- Added interactive areas overlay over images which can be used to make hiperlinks to scenes
- Images preload at the beginning of the interactive story
- Now if you don't include a 'text' attribute in an options object in a scene, the interface takes you directly to the new scene, otherwise, it creates a 'feedback' intermediate scene wich shows the text attribute
- It is now possible to use igramas in scenes
- Corrected an error in markov chains ngram separation
- The filename of markov models now includes the n number of ngrams
- **BREAKING CHANGE** loading models now must include the filename
- showIgrama or mostrarIgrama function now integrates Minigif and can show gifs. The arguments are (result, format..'png' or 'gif', container)
- It is now possible to delete elements from rule arrays in grammars by putting a '-' before the key. For example: `$newRule$[-key:ruleArray]`

## 2.2.0
- Added markov chains functions
- Added igrama support (generative images using aventura grammars)

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
