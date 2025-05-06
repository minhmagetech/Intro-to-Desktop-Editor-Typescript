import {DIFFICULTY, DifficultySong, LINES_PER_SECOND, MAX_LINE, Node_Type, OBSTACLES_SPAWN_INTERVAL, SongDataJson, TIME_MUL} from "BBA_Const";
import {Asset, AssetContentData, clamp, Component, Entity, NetworkEvent, Player, PropTypes} from "horizon/core";
import {ImageSource} from "horizon/ui";

export async function WaitForOwnerShipTransfer(entity: Entity, player: Player, component: Component)
{
  let tries = 0;
  const maxTries = 100; //100 tries at 100ms = 10 seconds
  let ownershipIsTransferred = entity.owner.get().id === player.id;

  while(!ownershipIsTransferred && tries < maxTries)
  {
    tries++;
    ownershipIsTransferred = entity.owner.get().id === player.id;
    await new Promise(resolve => component.async.setTimeout(resolve, 100));
  }

  if(!ownershipIsTransferred)
    throw new Error(`${entity.name} ownership transfer to ${player.name} failed after ${maxTries} tries`);
}

export async function WaitForNumberOfNetworkEventsReturn(event: NetworkEvent, numberOfEvents: number, component: Component, player: Player)
{
  let tries = 0;
  const maxTries = 100; //100 tries at 100ms = 10 seconds
  let eventReceivedCounts = 0;

  component.connectNetworkEvent(player, event, () =>
  {
    tries = 0;
    eventReceivedCounts++;
  });

  while(eventReceivedCounts < numberOfEvents && tries < maxTries)
  {
    tries++;
    await new Promise(resolve => component.async.setTimeout(resolve, 100));
  }

  if(eventReceivedCounts < numberOfEvents)
    throw new Error(`${event.name} event failed to receive ${numberOfEvents} number of events after ${maxTries} tries`);
}

export async function ReadSongDataFromJson<T>(asset: Asset): Promise<T | null>
{
  return await asset
    .fetchAsData()
    .then((output: AssetContentData) =>
    {
      return output.asJSON<T>();
    })
    .catch((error) =>
    {
      throw new Error("Failed to read song data from JSON: " + error);
    });
}

export function CalculatorMaxNote(timeMap: Array<number>, timeExistence: number): number
{
  console.log("maxNoteSpawn time " + timeExistence);
  let maxConcurrentNotes = 0;
  let currentNotes = 0;
  for(let i = 0; i < timeMap.length; i++)
  {
    const startTime = timeMap[i];
    const endTime = startTime + timeExistence;
    currentNotes = 1;
    for(let j = i + 1; j < timeMap.length; j++)
    {
      let timeE = (timeMap[j] - timeMap[i]) / TIME_MUL;
      let timeF = timeMap[i] + timeE;
      if(timeF >= startTime && timeF < endTime)
      {
        currentNotes++;
      }
    }

    if(currentNotes > maxConcurrentNotes)
    {
      maxConcurrentNotes = currentNotes;
    }
  }
  return maxConcurrentNotes + 2;
}

export function CalculateRandomNode(includeNumberList: number[], excludeNumberList: number[]): number
{
  if(excludeNumberList.length >= MAX_LINE) return -1;

  let random;
  do
  {
    random = Math.floor(Math.random() * MAX_LINE); // Random number between 0 and 5
  } while(!((includeNumberList.length == 0 || includeNumberList.includes(random)) && !excludeNumberList.includes(random))); // Retry if the number is in exclude Number List and not in include Number List
  return random;
}

export function GetSpawnLineIndexInRange(nextSpawnLine: number, prevSpawnLine: number, spawnLineInterval: number): number
{
  let interval = Math.max(spawnLineInterval, 1); // make sure the interval is at least 1
  return clamp(nextSpawnLine, Math.max(prevSpawnLine - interval, 0), Math.min(prevSpawnLine + interval, MAX_LINE - 1));
}

export function CalculateLinesInterval(prevSpawnTime: number, nextSpawnTime: number): number
{
  return Math.round(nextSpawnTime - prevSpawnTime) * LINES_PER_SECOND;
}


export function GetObstacleInterval(songMode: string): number
{
  switch(songMode)
  {
    case DIFFICULTY[0]:
      return OBSTACLES_SPAWN_INTERVAL * 3;
    case DIFFICULTY[1]:
      return OBSTACLES_SPAWN_INTERVAL * 2;
    case DIFFICULTY[2]:
      return OBSTACLES_SPAWN_INTERVAL * 1.5;
    case DIFFICULTY[3]:
      return OBSTACLES_SPAWN_INTERVAL;
    default:
      return OBSTACLES_SPAWN_INTERVAL * 3;
  }
}

export function GetObstacleSpawnLine(spawnCubes: Node_Type[]): number
{
  let includeNumberList: number[] = [];
  let excludeNumberList: number[] = [];

  let minIndex = spawnCubes.map(cube => cube.colorIndex).reduce((a, b) => Math.min(a, b));
  let maxIndex = spawnCubes.map(cube => cube.colorIndex).reduce((a, b) => Math.max(a, b));

  for(let i = minIndex; i <= maxIndex; i++)
  { // don't spawn obstacle on lines between prevCube and nextCube
    excludeNumberList.push(i);
  }

  return CalculateRandomNode(includeNumberList, excludeNumberList);
}

/**
* This function validates all the properties of an entity that are of type PropTypes.Entity.
* If an entity property is missing or undefined, a NullRefError is thrown.
* @param props - The properties of the entity.
* @param propsDefinition - The definition of the properties of the entity.
* @throws NullRefError - If an entity property is missing or undefined.
*/
export function ValidateAllNullableProps(props: Record<string, any>, propsDefinition: Record<string, any>)
{
  for(const key in propsDefinition)
  {
    if(propsDefinition.hasOwnProperty(key))
    {
      const prop = propsDefinition[key];
      if(prop.type === PropTypes.Entity || prop.type === PropTypes.Asset)
      {
        let propValue = props[key];
        if(!propValue)
        {
          console.error(`The prop "${key}" is of type PropTypes.Entity but is undefined or missing!`);
        }
      }
    }
  }
}


export function AssetIdToImageSource(id: string)
{
  return ImageSource.fromTextureAsset(new Asset(BigInt(id)));
}


export function GetJsonSongDifficultyId(songID: number, instrumentType: number, difficulty: number, listSong: SongDataJson[]): number
{
  switch(difficulty)
  {
    case DifficultySong.EASY:
      return listSong[songID].DifficultyLists[instrumentType].Easy!;
    case DifficultySong.MEDIUM:
      return listSong[songID].DifficultyLists[instrumentType].Medium!;

    case DifficultySong.HARD:
      return listSong[songID].DifficultyLists[instrumentType].Hard!;

    case DifficultySong.EXPERT:
      return listSong[songID].DifficultyLists[instrumentType].Expert!;
    default:
      break;
  }
  return -1;
}