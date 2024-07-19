export function generateUsername() {
    const adjectives = [
      'Happy', 'Sleepy', 'Grumpy', 'Sneezy', 'Dopey', 'Bashful', 'Doc',
      'Witty', 'Silly', 'Rusty', 'Ginger', 'Sunny', 'Luna', 'Mellow', 'Jazzy',
      'Snazzy', 'Fuzzy', 'Fluffy', 'Puffy', 'Fancy', 'Spiffy', 'Dicey', 'Zesty',
      'Brave', 'Clever', 'Breezy', 'Chirpy', 'Dizzy', 'Feisty', 'Giddy', 'Jolly',
      'Lively', 'Peppy', 'Perky', 'Quirky', 'Sparky', 'Zippy', 'Cheery', 'Frisky',
      'Nifty', 'Plucky', 'Swanky', 'Zappy', 'Bouncy', 'Dapper', 'Nimble', 'Perky',
      'Spunky', 'Zesty', 'Chipper', 'Gleeful', 'Perky', 'Sparkly', 'Zappy', 'Bubbly'
    ];
  
    const nouns = [
      'Panda', 'Penguin', 'Chipmunk', 'Llama', 'Sloth', 'Koala', 'Platypus',
      'Raccoon', 'Beaver', 'Hedgehog', 'Squirrel', 'Possum', 'Wombat', 'Lemur',
      'Meerkat', 'Armadillo', 'Otter', 'Badger', 'Ferret', 'Hamster', 'Capybara',
      'Aardvark', 'Alpaca', 'Antelope', 'Baboon', 'Bat', 'Bison', 'Chameleon',
      'Chinchilla', 'Coyote', 'Dolphin', 'Emu', 'Falcon', 'Gazelle', 'Giraffe',
      'Hyena', 'Iguana', 'Jaguar', 'Kangaroo', 'Kinkajou', 'Leopard', 'Manatee',
      'Narwhal', 'Ocelot', 'Quokka', 'Reindeer', 'Seal', 'Tapir', 'Vicuna',
      'Walrus', 'Yak', 'Zebra', 'Mongoose', 'Porcupine', 'Weasel', 'Marmot', 'Pika'
    ];
  
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const number = Math.floor(Math.random() * 10);
  
    return `${adjective}${noun}${number}`;
  }
  