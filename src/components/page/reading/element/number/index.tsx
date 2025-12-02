import { Text, StyleSheet, View, Pressable } from 'react-native';

import { useDispatch } from 'react-redux';
// import { indexSlice } from '../../../../../provider/redux/slice';
import { useNativeNavigation } from '../../../../../hooks';
import { defaultStorage } from '../../../../../utils/mmkv';

export const List1 = ({ count, index }: { count: number; index: number }) => {
  return (
    <View style={style.MainView}>
      <TenWrapper tensent={0} index={index} />
      <TenWrapper tensent={10} index={index} />
      <TenWrapper tensent={20} index={index} />
      <TenWrapper tensent={30} index={index} />
      <TenWrapper tensent={40} index={index} />
    </View>
  );
};

export const List2 = ({ count, index }: { count: number; index: number }) => {
  return (
    <View style={style.MainView}>
      <TenWrapper tensent={0} index={index} />
      <TenWrapper tensent={10} index={index} />
      <TenWrapper tensent={20} index={index} />
      <TenWrapper tensent={30} index={index} />
    </View>
  );
};

export const List3 = ({ count, index }: { count: number; index: number }) => {
  const ten = Math.floor(count / 10);
  const num = count % 10;

  return (
    <View style={style.MainView}>
      <TenWrapper tensent={0} index={index} />
      <TenWrapper tensent={10} index={index} />
      <View style={style.View}>
        <Number7 ten={ten} />
      </View>
    </View>
  );
};
export const List4 = ({ count, index }: { count: number; index: number }) => {
  const ten = Math.floor(count / 10);
  const num = count % 10;

  return (
    <View style={style.MainView}>
      <TenWrapper tensent={0} index={index} />
      <TenWrapper tensent={10} index={index} />
      <TenWrapper tensent={20} index={index} />
      <View style={style.View}>
        <Number6 ten={ten} />
      </View>
    </View>
  );
};
export const List5 = ({ count, index }: { count: number; index: number }) => {
  const ten = Math.floor(count / 10);
  const num = count % 10;

  return (
    <View style={style.MainView}>
      <TenWrapper tensent={0} index={index} />
      <TenWrapper tensent={10} index={index} />
      <TenWrapper tensent={20} index={index} />
      <View style={style.View}>
        <Number4 ten={ten} />
      </View>
    </View>
  );
};
export const List6 = ({ count, index }: { count: number; index: number }) => {
  const ten = Math.floor(count / 10);
  const num = count % 10;

  return (
    <View style={style.MainView}>
      <TenWrapper tensent={0} index={index} />
      <TenWrapper tensent={10} index={index} />
      <View style={style.View}>
        <Number4 ten={ten} />
      </View>
    </View>
  );
};
export const List7 = ({ count, index }: { count: number; index: number }) => {
  const ten = Math.floor(count / 10);
  const num = count % 10;

  return (
    <View style={style.MainView}>
      <TenWrapper tensent={0} index={index} />
      <TenWrapper tensent={10} index={index} />
      <View style={style.View}>
        <Number1 ten={ten} />
      </View>
    </View>
  );
};
export const List8 = ({ count, index }: { count: number; index: number }) => {
  const ten = Math.floor(count / 10);
  const num = count % 10;

  return (
    <View style={style.MainView}>
      <View style={style.View}>
        <Number4 ten={ten} />
      </View>
    </View>
  );
};
export const List9 = ({ count, index }: { count: number; index: number }) => {
  const ten = Math.floor(count / 10);
  const num = count % 10;

  return (
    <View style={style.MainView}>
      <TenWrapper tensent={0} index={index} />
      <TenWrapper tensent={10} index={index} />
      <TenWrapper tensent={20} index={index} />
      <View style={style.View}>
        <Number1 ten={ten} />
      </View>
    </View>
  );
};
export const List10 = ({ count, index }: { count: number; index: number }) => {
  const ten = Math.floor(count / 10);
  const num = count % 10;

  return (
    <View style={style.MainView}>
      <TenWrapper tensent={0} index={index} />
      <TenWrapper tensent={10} index={index} />
      <View style={style.View}>
        <Number4 ten={ten} />
      </View>
    </View>
  );
};
export const List11 = ({ count, index }: { count: number; index: number }) => {
  const ten = Math.floor(count / 10);
  const num = count % 10;

  return (
    <View style={style.MainView}>
      <TenWrapper tensent={0} index={index} />
      <TenWrapper tensent={10} index={index} />
      <View style={style.View}>
        <Number2 ten={ten} />
      </View>
    </View>
  );
};
export const List12 = ({ count, index }: { count: number; index: number }) => {
  const ten = Math.floor(count / 10);
  const num = count % 10;

  return (
    <View style={style.MainView}>
      <TenWrapper tensent={0} index={index} />
      <TenWrapper tensent={10} index={index} />
      <TenWrapper tensent={20} index={index} />
      <View style={style.View}>
        <Number5 ten={ten} />
      </View>
    </View>
  );
};
export const List13 = ({ count, index }: { count: number; index: number }) => {
  const ten = Math.floor(count / 10);
  const num = count % 10;

  return (
    <View style={style.MainView}>
      <TenWrapper tensent={0} index={index} />
      <TenWrapper tensent={10} index={index} />
      <TenWrapper tensent={20} index={index} />
      <View style={style.View}>
        <Number9 ten={ten} />
      </View>
    </View>
  );
};
export const List14 = ({ count, index }: { count: number; index: number }) => {
  const ten = Math.floor(count / 10);
  const num = count % 10;

  return (
    <View style={style.MainView}>
      <TenWrapper tensent={0} index={index} />
      <TenWrapper tensent={10} index={index} />
      <TenWrapper tensent={20} index={index} />
      <TenWrapper tensent={30} index={index} />
      <View style={style.View}>
        <Number6 ten={ten} />
      </View>
    </View>
  );
};
export const List15 = ({ count, index }: { count: number; index: number }) => {
  const ten = Math.floor(count / 10);
  const num = count % 10;

  return (
    <View style={style.MainView}>
      <TenWrapper tensent={0} index={index} />
    </View>
  );
};
export const List16 = ({ count, index }: { count: number; index: number }) => {
  const ten = Math.floor(count / 10);
  const num = count % 10;

  return (
    <View style={style.MainView}>
      <TenWrapper tensent={0} index={index} />
      <View style={style.View}>
        <Number3 ten={ten} />
      </View>
    </View>
  );
};
export const List17 = ({ count, index }: { count: number; index: number }) => {
  const ten = Math.floor(count / 10);
  const num = count % 10;

  return (
    <View style={style.MainView}>
      <TenWrapper tensent={0} index={index} />
    </View>
  );
};
export const List18 = ({ count, index }: { count: number; index: number }) => {
  const ten = Math.floor(count / 10);
  const num = count % 10;

  return (
    <View style={style.MainView}>
      <TenWrapper tensent={0} index={index} />
      <TenWrapper tensent={10} index={index} />
      <TenWrapper tensent={20} index={index} />
      <TenWrapper tensent={30} index={index} />
      <View style={style.View}>
        <Number2 ten={ten} />
      </View>
    </View>
  );
};
export const List19 = ({ count, index }: { count: number; index: number }) => {
  const ten = Math.floor(count / 10);
  const num = count % 10;

  return (
    <View style={style.MainView}>
      <TenWrapper tensent={0} index={index} />
      <TenWrapper tensent={10} index={index} />
      <TenWrapper tensent={20} index={index} />
      <TenWrapper tensent={40} index={index} />
      <TenWrapper tensent={50} index={index} />
      <TenWrapper tensent={60} index={index} />
      <TenWrapper tensent={70} index={index} />
      <TenWrapper tensent={80} index={index} />
      <TenWrapper tensent={90} index={index} />
      <TenWrapper tensent={100} index={index} />
      <TenWrapper tensent={110} index={index} />
      <TenWrapper tensent={120} index={index} />
      <TenWrapper tensent={130} index={index} />
      <TenWrapper tensent={140} index={index} />
    </View>
  );
};
export const List20 = ({ count, index }: { count: number; index: number }) => {
  const ten = Math.floor(count / 10);
  const num = count % 10;

  return (
    <View style={style.MainView}>
      <TenWrapper tensent={0} index={index} />
      <TenWrapper tensent={10} index={index} />
      <TenWrapper tensent={20} index={index} />
      <View style={style.View}>
        <Number1 ten={ten} />
      </View>
    </View>
  );
};
export const List21 = ({ count, index }: { count: number; index: number }) => {
  const ten = Math.floor(count / 10);
  const num = count % 10;

  return (
    <View style={style.MainView}>
      <TenWrapper tensent={0} index={index} />
      <View style={style.View}>
        <Number2 ten={ten} />
      </View>
    </View>
  );
};
export const List22 = ({ count, index }: { count: number; index: number }) => {
  const ten = Math.floor(count / 10);
  const num = count % 10;

  return (
    <View style={style.MainView}>
      <View style={style.View}>
        <Number8 ten={ten} />
      </View>
    </View>
  );
};
export const List23 = ({ count, index }: { count: number; index: number }) => {
  const ten = Math.floor(count / 10);
  const num = count % 10;

  return (
    <View style={style.MainView}>
      <TenWrapper tensent={0} index={index} />
      <TenWrapper tensent={10} index={index} />
      <TenWrapper tensent={20} index={index} />
      <TenWrapper tensent={30} index={index} />
      <TenWrapper tensent={40} index={index} />
      <TenWrapper tensent={50} index={index} />
      <View style={style.View}>
        <Number6 ten={ten} />
      </View>
    </View>
  );
};
export const List24 = ({ count, index }: { count: number; index: number }) => {
  const ten = Math.floor(count / 10);
  const num = count % 10;

  return (
    <View style={style.MainView}>
      <TenWrapper tensent={0} index={index} />
      <TenWrapper tensent={10} index={index} />
      <TenWrapper tensent={20} index={index} />
      <TenWrapper tensent={30} index={index} />
      <TenWrapper tensent={40} index={index} />
      <View style={style.View}>
        <Number2 ten={ten} />
      </View>
    </View>
  );
};
export const List25 = ({ count, index }: { count: number; index: number }) => {
  const ten = Math.floor(count / 10);
  const num = count % 10;

  return (
    <View style={style.MainView}>
      <View style={style.View}>
        <Number5 ten={ten} />
      </View>
    </View>
  );
};
export const List26 = ({ count, index }: { count: number; index: number }) => {
  const ten = Math.floor(count / 10);
  const num = count % 10;

  return (
    <View style={style.MainView}>
      <TenWrapper tensent={0} index={index} />
      <TenWrapper tensent={1} index={index} />
      <TenWrapper tensent={2} index={index} />
      <TenWrapper tensent={3} index={index} />
      <View style={style.View}>
        <Number8 ten={ten} />
      </View>
    </View>
  );
};
export const List27 = ({ count, index }: { count: number; index: number }) => {
  const ten = Math.floor(count / 10);
  const num = count % 10;

  return (
    <View style={style.MainView}>
      <TenWrapper tensent={0} index={index} />
      <View style={style.View}>
        <Number2 ten={ten} />
      </View>
    </View>
  );
};
export const List28 = ({ count, index }: { count: number; index: number }) => {
  const ten = Math.floor(count / 10);
  const num = count % 10;

  return (
    <View style={style.MainView}>
      <TenWrapper tensent={0} index={index} />
      <View style={style.View}>
        <Number4 ten={ten} />
      </View>
    </View>
  );
};
export const List29 = ({ count, index }: { count: number; index: number }) => {
  const ten = Math.floor(count / 10);
  const num = count % 10;

  return (
    <View style={style.MainView}>
      <View style={style.View}>
        <Number3 ten={ten} />
      </View>
    </View>
  );
};
export const List30 = ({ count, index }: { count: number; index: number }) => {
  const ten = Math.floor(count / 10);
  const num = count % 10;

  return (
    <View style={style.MainView}>
      <View style={style.View}>
        <Number9 ten={ten} />
      </View>
    </View>
  );
};
export const List31 = ({ count, index }: { count: number; index: number }) => {
  const ten = Math.floor(count / 10);
  const num = count % 10;

  return (
    <View style={style.MainView}>
      <View style={style.View}>
        <Number1 ten={ten} />
      </View>
    </View>
  );
};
export const List32 = ({ count, index }: { count: number; index: number }) => {
  const ten = Math.floor(count / 10);
  const num = count % 10;

  return (
    <View style={style.MainView}>
      <View style={style.View}>
        <Number4 ten={ten} />
      </View>
    </View>
  );
};
export const List33 = ({ count, index }: { count: number; index: number }) => {
  const ten = Math.floor(count / 10);
  const num = count % 10;

  return (
    <View style={style.MainView}>
      <View style={style.View}>
        <Number7 ten={ten} />
      </View>
    </View>
  );
};
export const List34 = ({ count, index }: { count: number; index: number }) => {
  const ten = Math.floor(count / 10);
  const num = count % 10;

  return (
    <View style={style.MainView}>
      <View style={style.View}>
        <Number3 ten={ten} />
      </View>
    </View>
  );
};
export const List35 = ({ count, index }: { count: number; index: number }) => {
  const ten = Math.floor(count / 10);
  const num = count % 10;

  return (
    <View style={style.MainView}>
      <View style={style.View}>
        <Number3 ten={ten} />
      </View>
    </View>
  );
};
export const List36 = ({ count, index }: { count: number; index: number }) => {
  const ten = Math.floor(count / 10);
  const num = count % 10;

  return (
    <View style={style.MainView}>
      <View style={style.View}>
        <Number3 ten={ten} />
      </View>
    </View>
  );
};
export const List37 = ({ count, index }: { count: number; index: number }) => {
  const ten = Math.floor(count / 10);
  const num = count % 10;

  return (
    <View style={style.MainView}>
      <View style={style.View}>
        <Number2 ten={ten} />
      </View>
    </View>
  );
};
export const List38 = ({ count, index }: { count: number; index: number }) => {
  const ten = Math.floor(count / 10);
  const num = count % 10;

  return (
    <View style={style.MainView}>
      <TenWrapper tensent={0} index={index} />
      <View style={style.View}>
        <Number4 ten={ten} />
      </View>
    </View>
  );
};
export const List39 = ({ count, index }: { count: number; index: number }) => {
  const ten = Math.floor(count / 10);
  const num = count % 10;

  return (
    <View style={style.MainView}>
      <View style={style.View}>
        <Number4 ten={ten} />
      </View>
    </View>
  );
};

export const ReturnEl = ({
  count,
  index
}: {
  count: number;
  index: number;
}) => {
  switch (index + 1) {
    case 1:
      return <List1 count={count} index={index} />;
    case 2:
      return <List2 count={count} index={index} />;
    case 3:
      return <List3 count={count} index={index} />;
    case 4:
      return <List4 count={count} index={index} />;
    case 5:
      return <List5 count={count} index={index} />;
    case 6:
      return <List6 count={count} index={index} />;
    case 7:
      return <List7 count={count} index={index} />;
    case 8:
      return <List8 count={count} index={index} />;
    case 9:
      return <List9 count={count} index={index} />;
    case 10:
      return <List10 count={count} index={index} />;
    case 11:
      return <List11 count={count} index={index} />;
    case 12:
      return <List12 count={count} index={index} />;
    case 13:
      return <List13 count={count} index={index} />;
    case 14:
      return <List14 count={count} index={index} />;
    case 15:
      return <List15 count={count} index={index} />;
    case 16:
      return <List16 count={count} index={index} />;
    case 17:
      return <List17 count={count} index={index} />;
    case 18:
      return <List18 count={count} index={index} />;
    case 19:
      return <List19 count={count} index={index} />;
    case 20:
      return <List20 count={count} index={index} />;
    case 21:
      return <List21 count={count} index={index} />;
    case 22:
      return <List22 count={count} index={index} />;
    case 23:
      return <List23 count={count} index={index} />;
    case 24:
      return <List24 count={count} index={index} />;
    case 25:
      return <List25 count={count} index={index} />;
    case 26:
      return <List26 count={count} index={index} />;
    case 27:
      return <List27 count={count} index={index} />;
    case 28:
      return <List28 count={count} index={index} />;
    case 29:
      return <List29 count={count} index={index} />;
    case 30:
      return <List30 count={count} index={index} />;
    case 31:
      return <List31 count={count} index={index} />;
    case 32:
      return <List32 count={count} index={index} />;
    case 33:
      return <List33 count={count} index={index} />;
    case 34:
      return <List34 count={count} index={index} />;
    case 35:
      return <List35 count={count} index={index} />;
    case 36:
      return <List36 count={count} index={index} />;
    case 37:
      return <List37 count={count} index={index} />;
    case 38:
      return <List38 count={count} index={index} />;
    case 39:
      return <List39 count={count} index={index} />;
    default:
      return <></>;
  }
};

const TenWrapper = ({ tensent, index }: { tensent: number; index: number }) => {
  const { navigation } = useNativeNavigation();

  const dispatch = useDispatch();

  const onMainNavigate = (book: number, jang: number) => {
    defaultStorage.set('bible_book', book + 1);
    defaultStorage.set('bible_jang', jang);
    // dispatch(indexSlice.actions.change({ BOOK: book + 1, JANG: jang }));

    navigation.navigate('BibleScreen', { show: true });
  };

  return (
    <>
      <View style={style.View}>
        <Pressable
          style={style.TouchableOpacity}
          onPress={() => onMainNavigate(index, tensent + 1)}
        >
          <Text style={{ ...style.Text }}>{tensent + 1}</Text>
        </Pressable>
        <Pressable
          style={style.TouchableOpacity}
          onPress={() => onMainNavigate(index, tensent + 2)}
        >
          <Text style={style.Text}>{tensent + 2}</Text>
        </Pressable>
        <Pressable
          style={style.TouchableOpacity}
          onPress={() => onMainNavigate(index, tensent + 3)}
        >
          <Text style={style.Text}>{tensent + 3}</Text>
        </Pressable>
        <Pressable
          style={style.TouchableOpacity}
          onPress={() => onMainNavigate(index, tensent + 4)}
        >
          <Text style={style.Text}>{tensent + 4}</Text>
        </Pressable>
        <Pressable
          style={style.TouchableOpacity}
          onPress={() => onMainNavigate(index, tensent + 5)}
        >
          <Text style={style.Text}>{tensent + 5}</Text>
        </Pressable>
        <Pressable
          style={style.TouchableOpacity}
          onPress={() => onMainNavigate(index, tensent + 6)}
        >
          <Text style={style.Text}>{tensent + 6}</Text>
        </Pressable>
        <Pressable
          style={style.TouchableOpacity}
          onPress={() => onMainNavigate(index, tensent + 7)}
        >
          <Text style={style.Text}>{tensent + 7}</Text>
        </Pressable>
        <Pressable
          style={style.TouchableOpacity}
          onPress={() => onMainNavigate(index, tensent + 8)}
        >
          <Text style={style.Text}>{tensent + 8}</Text>
        </Pressable>
        <Pressable
          style={style.TouchableOpacity}
          onPress={() => onMainNavigate(index, tensent + 9)}
        >
          <Text style={style.Text}>{tensent + 9}</Text>
        </Pressable>
        <Pressable
          style={style.TouchableOpacity}
          onPress={() => onMainNavigate(index, tensent + 10)}
        >
          <Text style={style.Text}>{!tensent ? 10 : tensent + 10}</Text>
        </Pressable>
      </View>
    </>
  );
};
const Number1 = ({ ten }: { ten: number }) => {
  return (
    <>
      <NumberWrapper ten={ten} id={0} />
      <NumberWrapper ten={ten} id={''} />
      <NumberWrapper ten={ten} id={''} />
      <NumberWrapper ten={ten} id={''} />
      <NumberWrapper ten={ten} id={''} />
      <NumberWrapper ten={ten} id={''} />
      <NumberWrapper ten={ten} id={''} />
      <NumberWrapper ten={ten} id={''} />
      <NumberWrapper ten={ten} id={''} />
      <NumberWrapper ten={ten} id={''} />
    </>
  );
};

const Number2 = ({ ten }: { ten: number }) => {
  return (
    <>
      <NumberWrapper ten={ten} id={0} />
      <NumberWrapper ten={ten} id={1} />
      <NumberWrapper ten={ten} id={''} />
      <NumberWrapper ten={ten} id={''} />
      <NumberWrapper ten={ten} id={''} />
      <NumberWrapper ten={ten} id={''} />
      <NumberWrapper ten={ten} id={''} />
      <NumberWrapper ten={ten} id={''} />
      <NumberWrapper ten={ten} id={''} />
      <NumberWrapper ten={ten} id={''} />
    </>
  );
};

const Number3 = ({ ten }: { ten: number }) => {
  return (
    <>
      <NumberWrapper ten={ten} id={0} />
      <NumberWrapper ten={ten} id={1} />
      <NumberWrapper ten={ten} id={2} />
      <NumberWrapper ten={ten} id={''} />
      <NumberWrapper ten={ten} id={''} />
      <NumberWrapper ten={ten} id={''} />
      <NumberWrapper ten={ten} id={''} />
      <NumberWrapper ten={ten} id={''} />
      <NumberWrapper ten={ten} id={''} />
      <NumberWrapper ten={ten} id={''} />
    </>
  );
};

const Number4 = ({ ten }: { ten: number }) => {
  return (
    <>
      <NumberWrapper ten={ten} id={0} />
      <NumberWrapper ten={ten} id={1} />
      <NumberWrapper ten={ten} id={2} />
      <NumberWrapper ten={ten} id={3} />
      <NumberWrapper ten={ten} id={''} />
      <NumberWrapper ten={ten} id={''} />
      <NumberWrapper ten={ten} id={''} />
      <NumberWrapper ten={ten} id={''} />
      <NumberWrapper ten={ten} id={''} />
      <NumberWrapper ten={ten} id={''} />
    </>
  );
};

const Number6 = ({ ten }: { ten: number }) => {
  return (
    <>
      <NumberWrapper ten={ten} id={0} />
      <NumberWrapper ten={ten} id={1} />
      <NumberWrapper ten={ten} id={2} />
      <NumberWrapper ten={ten} id={3} />
      <NumberWrapper ten={ten} id={4} />
      <NumberWrapper ten={ten} id={5} />
      <NumberWrapper ten={ten} id={''} />
      <NumberWrapper ten={ten} id={''} />
      <NumberWrapper ten={ten} id={''} />
      <NumberWrapper ten={ten} id={''} />
    </>
  );
};
const Number7 = ({ ten }: { ten: number }) => {
  return (
    <>
      <NumberWrapper ten={ten} id={0} />
      <NumberWrapper ten={ten} id={1} />
      <NumberWrapper ten={ten} id={2} />
      <NumberWrapper ten={ten} id={3} />
      <NumberWrapper ten={ten} id={4} />
      <NumberWrapper ten={ten} id={5} />
      <NumberWrapper ten={ten} id={6} />
      <NumberWrapper ten={ten} id={''} />
      <NumberWrapper ten={ten} id={''} />
      <NumberWrapper ten={ten} id={''} />
    </>
  );
};
const Number8 = ({ ten }: { ten: number }) => {
  return (
    <>
      <NumberWrapper ten={ten} id={0} />
      <NumberWrapper ten={ten} id={1} />
      <NumberWrapper ten={ten} id={2} />
      <NumberWrapper ten={ten} id={3} />
      <NumberWrapper ten={ten} id={4} />
      <NumberWrapper ten={ten} id={5} />
      <NumberWrapper ten={ten} id={6} />
      <NumberWrapper ten={ten} id={7} />
      <NumberWrapper ten={ten} id={''} />
      <NumberWrapper ten={ten} id={''} />
    </>
  );
};
const Number5 = ({ ten }: { ten: number }) => {
  return (
    <>
      <NumberWrapper ten={ten} id={0} />
      <NumberWrapper ten={ten} id={1} />
      <NumberWrapper ten={ten} id={2} />
      <NumberWrapper ten={ten} id={3} />
      <NumberWrapper ten={ten} id={4} />
      <NumberWrapper ten={ten} id={''} />
      <NumberWrapper ten={ten} id={''} />
      <NumberWrapper ten={ten} id={''} />
      <NumberWrapper ten={ten} id={''} />
      <NumberWrapper ten={ten} id={''} />
    </>
  );
};
const Number9 = ({ ten }: { ten: number }) => {
  return (
    <>
      <NumberWrapper ten={ten} id={0} />
      <NumberWrapper ten={ten} id={1} />
      <NumberWrapper ten={ten} id={2} />
      <NumberWrapper ten={ten} id={3} />
      <NumberWrapper ten={ten} id={4} />
      <NumberWrapper ten={ten} id={5} />
      <NumberWrapper ten={ten} id={6} />
      <NumberWrapper ten={ten} id={7} />
      <NumberWrapper ten={ten} id={8} />
      <NumberWrapper ten={ten} id={''} />
    </>
  );
};

const NumberWrapper = ({ ten, id }: { ten: number; id: any }) => {
  return (
    <Pressable key={Math.random()} style={style.TouchableOpacity}>
      {id === '' ? (
        <Text style={style.Text}>{''}</Text>
      ) : (
        <Text style={style.Text}>{`${ten * 10 + id + 1}`}</Text>
      )}
    </Pressable>
  );
};

const style = StyleSheet.create({
  MainView: {
    display: 'flex',
    flexWrap: 'wrap',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center'
  },
  View: {
    width: '90%',
    backgroundColor: 'white',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginVertical: 10
  },
  TouchableOpacity: {
    width: '10%',
    justifyContent: 'center',
    fontSize: 14
  },
  Text: {
    color: '#000000',
    textAlign: 'center'
  }
});
