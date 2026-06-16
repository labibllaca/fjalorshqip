export const groupBy = <T>(list: T[], keyGetter: (elem: T) => string) => {
  return list.reduce(
    (acc, elem) => {
      return pushToListGroup(acc, keyGetter(elem), elem);
    },
    {} as {
      [key: string]: T[];
    }
  );
};

export const pushToListGroup = <T>(
  acc: { [key: string]: T[] },
  key: string,
  elem: T
) => {
  if (acc[key]) {
    acc[key].push(elem);
  } else {
    acc[key] = [elem];
  }
  return acc;
};
