let focusActive = false

chrome.runtime.onMessage.addListener((msg) => {

    if (msg.action === "focus") {
        focusActive = true
        enableFocus()
    }

    if (msg.action === "restore") {
        location.reload()
    }

})

function enableFocus() {

    document.body.style.cursor = "crosshair"

    document.addEventListener("mouseover", highlight)
    document.addEventListener("click", selectElement)

}

function highlight(e) {

    if (!focusActive) return

    removeHighlight()

    e.target.style.outline = "2px solid red"
    e.target.classList.add("focus-highlight")

}

function removeHighlight() {
    document.querySelectorAll(".focus-highlight")
        .forEach(el => {
            el.style.outline = ""
            el.classList.remove("focus-highlight")
        })
}

function selectElement(e) {

    if (!focusActive) return

    e.preventDefault()
    e.stopPropagation()

    const selected = e.target

    document.body.innerHTML = selected.outerHTML

    focusActive = false
}