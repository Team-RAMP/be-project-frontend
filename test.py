def prompt_generator(video_prompt):
    llm_prompt = ("""Generate a realistic script with multiple scenes.

Each scene would be a json containing two key-values.
{
    "video_description": "Exactly one short and concise sentence describing the entities and their actions (if any)"
    "scene_description": "A general description of the scene",
}

Avoid showing human faces as far as possible.

If the prompt is something like "Surprise Me", then consider a random prompt.

Please try to stick to what's mentioned in the prompt and be as relevant as possible.

Please make sure that the response is exactly and nothing a valid list of JSON.

Please generate a list of such jsons for the following prompt:\n"""
f"{video_prompt}"
)

    formatted_prompt = (
    f"A chat between a curious human and an artificial intelligence assistant."
    f"The assistant gives helpful, detailed, and polite answers to the user's questions.\n"
    f"### Human: {prompt}\n\n### Assistant:"
    )

    inputs = tokenizer(formatted_prompt, return_tensors="pt").to("cuda:0")
    outputs = model.generate(inputs=inputs.input_ids, max_new_tokens=max_token_count + len(video_prompt) + 400)

    raw_output = tokenizer.decode(outputs[0], skip_special_tokens=True)
    actual_output = raw_output[len(formatted_prompt):]
    
    

prompt_generator("A story of a girl dancing and singing down the street")

inputs = tokenizer(formatted_prompt, return_tensors="pt").to("cuda:0")
outputs = model.generate(inputs=inputs.input_ids, max_new_tokens=max_token_count + len(video_prompt) + 400)
print()