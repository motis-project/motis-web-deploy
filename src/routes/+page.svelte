<script lang="ts">
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import * as Alert from '$lib/components/ui/alert';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import Label from '$lib/components/ui/label/label.svelte';
	import { cn } from '$lib/utils';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';

	const { data, form } = $props();

	const regions: Record<string, string> = {
		nantes: 'Nantes (FR)',
		helsinki: 'Helsinki (FI)'
	};
	let region = $state<string>();
</script>

<div class="flex h-screen items-center justify-center">
	<div class="flex gap-8">
		<Card.Root class="w-md">
			<Card.Header>
				<Card.Title>Running MOTIS instances</Card.Title>
				<Card.Description>These instances are already running.</Card.Description>
			</Card.Header>
			<Card.Content>
				<ul class="list-inside list-disc">
					{#each data.ports as port}
						<li><a href="instances/{port}/" target="_blank">{port}</a></li>
					{/each}
				</ul>
			</Card.Content>
		</Card.Root>

		<Card.Root class="w-md">
			<Card.Header>
				<Card.Title>Create new MOTIS Instance</Card.Title>
				<Card.Description>Choose your region and upload a GTFS dataset.</Card.Description>
			</Card.Header>
			<Card.Content>
				{#if form}
					{#if form.error}
						<div class="text-red-500">
							{form.error}
						</div>
					{/if}

					{#if form.success}
						<Alert.Root class="mb-4" variant="success">
							<Alert.Title>New MOTIS Instance created!</Alert.Title>
							<Alert.Description>
								Your new Instance is now online!<br />
								<span>
									Click
									<a href="instances/{form.port}/" target="_blank" class="font-bold underline">
										here
									</a> to try it out.
								</span>
							</Alert.Description>
						</Alert.Root>
					{/if}
				{/if}

				<form method="post" enctype="multipart/form-data" class="flex flex-col gap-6">
					<div class="flex flex-col gap-2">
						<Label for="region">Region</Label>
						<div class="relative w-full">
							<select
								name="zone"
								id="zone"
								class={cn(
									buttonVariants({ variant: 'outline' }),
									'w-full appearance-none font-normal'
								)}
							>
								<option id="zone" selected={!region} disabled>Select Region</option>
								{#each Object.entries(regions) as [id, name]}
									<option id="zone" value={id} selected={region == id}>
										{name}
									</option>
								{/each}
							</select>
							<ChevronDown class="absolute top-2.5 right-3 size-4 opacity-50" />
						</div>
					</div>

					<div class="flex flex-col gap-2">
						<Label for="gtfs">GTFS Dataset</Label>
						<Input type="file" id="file" name="gtfs" accept="application/x-zip-compressed" />
					</div>

					<Button type="submit">Run</Button>
				</form>
			</Card.Content>
		</Card.Root>
	</div>
</div>
