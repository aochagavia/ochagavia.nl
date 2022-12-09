+++
title = "Rocket - A Rust game running on WASM"
date = "2017-12-03"
+++

Two weeks ago, Alex Crichton's [PR][wasm32-rust-pr] adding a target for
WebAssembly to the Rust compiler was merged. There are many differences
between this target and the Emscripten one, but the important one for me is that
it doesn't depend on external stuff like the Emscripten SDK (which
IIRC used to be a pain to get working on Windows, but seems to be better
now).

After seeing the examples on [hellorust.com][hellorust], I thought it would
be interesting to try to adapt my game [Rocket][rocket-piston] to work
on the browser through the `wasm32-unknown-unknown` target. The project
was a great way to figure out how far you can go when porting a project that
is a bit more complex than a hello world. I was pleasantly surprised by the
fact that most of the code could be reused. Particularly, the game logic code
was barely touched at all.

### TLDR

Here is the [source code][rocket-wasm]. Also, you can play the game in the canvas
below or [on a dedicated tab][rocket-wasm-online].

The controls are:

* Left and right arrows: turn left and right
* Up arrow: boost
* Space: shoot

<canvas id="canvas" height="300px" style="width: 100%;"></canvas>
<script src="/js/embedded-rocket.js"></script>

## An MVP

### Getting things to compile: removing Piston

Before I started, the little I knew about WebAssembly was that it doesn't allow
you to interface with the OS, graphics card or other stuff like that. Using
Emscripten seems to be a way around this problem, but I guess you still need
to adapt your programs to some extent... I have never used it, though, so take
my words with a grain of salt.

After cloning the Rocket repository I started removing stuff. The first thing to
go was the dependency on Piston. I didn't even try to compile Rocket to wasm
before this step, as it is obvious that Piston requires OS support.

At this point, we were left with:

1. No game loop
1. No rendering
1. No player input

### Rebuilding the game: laying down the basic structure

So here we are without even a main function. This means that the game loop should
be implemented in Javascript and call into our Rust functions. Therefore
we need a set of basic functions that are enough to drive the execution of the
game, draw something to the screen and process user input.

Since rendering and processing player input are more involved than just updating
the game state, I chose the latter as a first function to implement. I was able
to reuse the code for the game logic without any change, so the function ended
up looking as follows:

```rust
#[no_mangle]
pub extern "C" fn update(time: c_double) {
  let data: &mut GameData = &mut DATA.lock().unwrap();
  data.time_controller.update_seconds(time, &data.actions, &mut data.state);
  CollisionsController::handle_collisions(&mut data.state);
}
```

Surprisingly, the [update function on the original game][update-rocket-piston] is *exactly the same*,
with the exception of the use of `DATA`. By the way, we use `DATA` to
store state instead of passing it between Javascript and Rust every time we call
a function. The definition is quite simple:

```rust
lazy_static! {
  static ref DATA: Mutex<GameData> = Mutex::new(new_game_data(1024.0, 600.0));
}
```

Since `DATA` is accessible from anywhere in the program, Rust forces us to use
a `Mutex` to ensure thread safety. Technically, this isn't necessary in the case
of Javascript, since there will only be one thread. Still, the type system knows
nothing about that... Hence the mutex.

### Getting things to compile, take two

With Piston out of the way, I set out to get the rest of the code to compile and
to run it in the browser as a simulation without any visual output. This is the
moment where difficulties started to pop out.

The first problem I encountered was caused by the dependency on `rand`. Generating
random numbers doesn't necessarily require OS support, but you need to generate a
seed some way or another. For this reason, `rand` relies on an `OsRng` struct that
is platform-dependent. Guess what... WebAssembly didn't had such a struct, so the
crate could not be compiled.

Fortunately, the problem was easily solved by [adding such a struct][rand-pr].
After patching the crate, the code finally compiled... but it didn't run in the
browser.

By the way, you are probably wondering about the seeding problem. If there is no way
to communicate with the outside world from your WebAssembly programs, how can you
get a seed? Below I will describe how you can call Javascript functions from Rust,
which could be a solution to the problem. However, I decided to use a constant seed,
which is clearly not optimal, but is good enough for a playable demo.

### Getting things to run: link errors

I mentioned in the paragraph above that the resulting program didn't run on the browser.
Concretely, after following the instructions on [hellorust.com][hellorust], I got the
following error:

```
TypeError: import object field 'env' is not an Object
```

After looking around for a while, this turned out to be a linking problem. In other words,
the generated Rust code contained calls to functions that didn't exist. Therefore, the
browser expected me to pass an import object containing said functions. It seems that
some `f64` functions I used in the physics part of the game have no analogous on
WebAssembly, so I had to pass them explicitly from Javascript through the following object:

```js
let imports = {
  env: {
    Math_atan: Math.atan,
    sin: Math.sin,
    cos: Math.cos
  }
};
```

After this, the code compiled and could be loaded on the browser, though without
any kind of visual feedback. Rust running on the browser! Finally.

## Making the game actually playable

### Rendering

At this point I discovered that you could call Javascript functions from within the
Rust program. This follows the same principle as using C functions from a library.
On the Rust side, you need to declare the function as `extern`. On the Javascript
side, you need to add the function to the imports, so it can be linked.

This means we can define drawing functions on the Javascript side and call them from
Rust. Even though WebAssembly itself cannot interact with the outside world, it can
still call Javascript functions you explicitly pass through the `imports` object.
This will be our escape hatch to render the game to a canvas

Rendering things to the screen was as easy as adding a bunch of functions to my program:

```rust
extern "C" {
    fn clear_screen();
    fn draw_player(_: c_double, _: c_double, _: c_double);
    fn draw_enemy(_: c_double, _: c_double);
    fn draw_bullet(_: c_double, _: c_double);
    fn draw_particle(_: c_double, _: c_double, _: c_double);
    fn draw_score(_: c_double);
}
```

Of course, these functions had to be implemented on the Javascript side. You can find
them on the source code of the demo. You won't find any surprises there, as the only
thing they do is drawing to a canvas.

With these extern functions in place, I could implement the rest of the drawing code
in Rust as shown below:

```rust
#[no_mangle]
pub unsafe extern "C" fn draw() {
    use geometry::{Advance, Position};
    let data = &mut DATA.lock().unwrap();
    let world = &data.state.world;

    clear_screen();
    for particle in &world.particles {
        draw_particle(particle.x(), particle.y(), 5.0 * particle.ttl);
    }

    for bullet in &world.bullets {
        draw_bullet(bullet.x(), bullet.y());
    }

    for enemy in &world.enemies {
        draw_enemy(enemy.x(), enemy.y());
    }

    draw_player(world.player.x(), world.player.y(), world.player.direction());
    draw_score(data.state.score as f64);
}
```

Again, if you compare this code to the [original version][draw-rocket-piston],
you will see that they are strikingly similar.

### Processing user input

With simulation and rendering in place, enabling user input was almost trivial.
First of all, I added a bunch of functions to toggle user actions on and off.
Note that I am using a Rust type as a parameter of each function. This is
technically incorrect, but I am not sure about which type I should use instead.
If you do, please open a PR so it can be fixed.

```rust
#[no_mangle]
pub extern "C" fn toggle_shoot(b: bool) {
    let data = &mut DATA.lock().unwrap();
    data.actions.shoot = b;
}

#[no_mangle]
pub extern "C" fn toggle_boost(b: bool) {
    let data = &mut DATA.lock().unwrap();
    data.actions.boost = b;
}

#[no_mangle]
pub extern "C" fn toggle_turn_left(b: bool) {
    let data = &mut DATA.lock().unwrap();
    data.actions.rotate_left = b;
}

#[no_mangle]
pub extern "C" fn toggle_turn_right(b: bool) {
    let data = &mut DATA.lock().unwrap();
    data.actions.rotate_right = b;
}
```

In this case, the code did differ considerably from the [original version][input-rocket-piston],
since the latter relies on the `piston_window::Key` struct, which no longer exists. In the wasm
version, I moved the key matching logic to Javascript, since I didn't want to pass strings between
Javascript and Rust. The resulting code is straightforward:

```js
// Input processing
function processKey(key, b) {
  switch (key) {
    case "ArrowLeft":
      module.toggle_turn_left(b);
      break;
    case "ArrowRight":
      module.toggle_turn_right(b);
      break;
    case "ArrowUp":
      module.toggle_boost(b);
      break;
    case " ":
      module.toggle_shoot(b);
      break;
  }
}
document.addEventListener('keydown', e => processKey(e.key, true));
document.addEventListener('keyup', e => processKey(e.key, false));
```

# Conclusion

Even though the `wasm32-unknown-unknown` target is quite new, it clearly has a
lot of potential. I am impressed by the fact that I was able to port Rocket
with almost no modifications to the game logic code. In the end, I ended up
spending most of the time dealing with rendering and figuring out how to correctly
set up the integration between Javascript and Rust.

# Discussion

Comment on [reddit] or [HN]!

[wasm32-rust-pr]: https://github.com/rust-lang/rust/pull/45905
[hellorust]: https://www.hellorust.com
[draw-rocket-piston]: https://github.com/aochagavia/rocket/blob/c13232b074da14662cc24ee075f7ef66521e5d27/src/view.rs#L31-L45
[input-rocket-piston]: https://github.com/aochagavia/rocket/blob/c13232b074da14662cc24ee075f7ef66521e5d27/src/controllers/input.rs#L39-L47
[update-rocket-piston]: https://github.com/aochagavia/rocket/blob/c13232b074da14662cc24ee075f7ef66521e5d27/src/main.rs#L71-L74
[rand-pr]: https://github.com/rust-lang-nursery/rand/pull/197
[reddit]: https://www.reddit.com/r/rust/comments/7ha3gj/rocket_a_rust_game_running_on_wasm/
[HN]: https://news.ycombinator.com/item?id=15843064
[rocket-piston]: https://github.com/aochagavia/rocket
[rocket-wasm]: https://github.com/aochagavia/rocket_wasm
[rocket-wasm-online]: https://aochagavia.github.io/rocket_wasm/
