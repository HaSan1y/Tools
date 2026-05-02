bl_info = {
    "name": "LM Studio Prompt Executor",
    "author": "HaSan1y",
    "version": (1, 0),
    "blender": (3, 0, 0),
    "location": "View3D > N Panel > LM Studio",
    "description": "Send a prompt to LM Studio and execute the generated Python code in Blender.",
    "warning": "Executes AI-generated code directly. Use with caution.",
    "doc_url": "",
    "category": "Development",
}

import bpy  # type: ignore
import urllib.request
import json
import re


class LMSTUDIO_PG_properties(bpy.types.PropertyGroup):
    prompt: bpy.props.StringProperty(  # type: ignore
        name="Prompt",
        description="Enter your task for the AI",
        default="Add a cube and scale it by 2",
        maxlen=1024,
    )
    api_url: bpy.props.StringProperty(  # type: ignore
        name="API URL",
        description="LM Studio local server endpoint",
        default="http://localhost:1234/v1/chat/completions",
    )


class LMSTUDIO_OT_execute_prompt(bpy.types.Operator):
    bl_idname = "object.lmstudio_execute"
    bl_label = "Send and Execute"
    bl_description = "Sends prompt to LM Studio and executes the python response"

    def execute(self, context):
        props = context.scene.lmstudio_props

        system_message = (
            "You are a Blender Python script generator. The user will ask you to perform a task in Blender. "
            "You must respond ONLY with valid, complete Blender Python code that accomplishes the task. "
            "Do not include any explanations or markdown formatting outside of the code block. "
            "The code should start with `import bpy`. Use the standard Blender API. "
            "Make sure the code is safe to execute and does exactly what is requested."
        )

        data = {
            "model": "local-model",  # The specific model name usually doesn't matter for LM Studio
            "messages": [
                {"role": "system", "content": system_message},
                {"role": "user", "content": props.prompt},
            ],
            "temperature": 0.1,
        }

        req = urllib.request.Request(
            props.api_url,
            data=json.dumps(data).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )

        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                result = json.loads(response.read().decode("utf-8"))

            if "choices" in result and len(result["choices"]) > 0:
                reply = result["choices"][0]["message"]["content"]

                # Extract python code block if present
                match = re.search(r"```python\s*(.*?)\s*```", reply, re.DOTALL)
                if match:
                    code = match.group(1)
                else:
                    # Strip any backticks if no python block specified
                    code = reply.replace("```", "").strip()

                self.report({"INFO"}, "Received response, executing...")

                # Execute the code
                try:
                    exec(code, globals(), locals())
                    self.report({"INFO"}, "Executed successfully!")
                except Exception as e:
                    self.report({"ERROR"}, f"Execution Error: {str(e)}")
                    print(f"Failed to execute code:\n{code}\nError: {e}")
            else:
                self.report({"ERROR"}, "Invalid response from LM Studio")

        except urllib.error.URLError as e:
            self.report({"ERROR"}, f"Connection Error: {str(e)}")
        except Exception as e:
            self.report({"ERROR"}, f"Error: {str(e)}")

        return {"FINISHED"}


class LMSTUDIO_PT_panel(bpy.types.Panel):
    bl_label = "LM Studio"
    bl_idname = "VIEW3D_PT_lmstudio"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "LM Studio"

    def draw(self, context):
        layout = self.layout
        props = context.scene.lmstudio_props

        # Use rows and boxes for a better UI layout
        box = layout.box()
        box.label(text="Settings:")
        box.prop(props, "api_url", text="URL")

        box = layout.box()
        box.label(text="AI Task:")
        # Provide a text area for the prompt
        box.prop(props, "prompt", text="")

        layout.separator()
        layout.operator(LMSTUDIO_OT_execute_prompt.bl_idname, icon="PLAY")


classes = (
    LMSTUDIO_PG_properties,
    LMSTUDIO_OT_execute_prompt,
    LMSTUDIO_PT_panel,
)


def register():
    for cls in classes:
        bpy.utils.register_class(cls)
    bpy.types.Scene.lmstudio_props = bpy.props.PointerProperty(
        type=LMSTUDIO_PG_properties
    )


def unregister():
    for cls in reversed(classes):
        bpy.utils.unregister_class(cls)
    del bpy.types.Scene.lmstudio_props


if __name__ == "__main__":
    register()
