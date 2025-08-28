

## Usage

```sh
stripe trigger customer.subscription.updated --raw "$(cat [file].json)"
```

### Paused subscription

```sh
stripe trigger customer.subscription.updated --raw "$(cat paused_subscription.json)"
```

### Trial ending soon

```sh
stripe trigger customer.subscription.updated --raw "$(cat trial_ending_soon.json)"
```


