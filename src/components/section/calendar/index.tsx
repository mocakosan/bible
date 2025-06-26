import { Actionsheet } from 'native-base';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import AntDesignIcons from 'react-native-vector-icons/AntDesign';
import { memo } from 'react';
import { Button, Dimensions, Text, TouchableOpacity, View } from 'react-native';
import { useBaseStyle } from '../../../hooks';

interface Props {
  isOpen: number;
  onClose: (e?: any) => void;
  onChange: (day: string) => void;
}
LocaleConfig.locales['fr'] = {
  monthNames: [
    '1월',
    '2월',
    '3월',
    '4월',
    '5월',
    '6월',
    '7월',
    '8월',
    '9월',
    '10월',
    '11월',
    '12월'
  ],
  monthNamesShort: [
    '1월',
    '2월',
    '3월',
    '4월',
    '5월',
    '6월',
    '7월',
    '8월',
    '9월',
    '10월',
    '11월',
    '12월'
  ],
  dayNames: [
    '일요일',
    '월요일',
    '화요일',
    '수요일',
    '목요일',
    '금요일',
    '토요일'
  ],
  dayNamesShort: ['일', '월', '화', '수', '목', '금', '토'],
  today: "Aujourd'hui"
};
LocaleConfig.defaultLocale = 'fr';

function Calender({ isOpen, onClose, onChange }: Props) {
  const width = Dimensions.get('window').width;
  const open = isOpen === 1 || isOpen === 2;

  const { color } = useBaseStyle();

  const renderDay = (date: any, item: any) => {
    const dayOfWeek = new Date(date.date.timestamp).getDay();
    const isSunday = dayOfWeek === 0;
    const dayStyle = isSunday ? { color: 'red' } : { color: 'black' };
    /* onChange(date.date); */
    /* onClose(0); */

    const onPress = () => {
      onChange(date.date.dateString);
      onClose(0);
    };

    return (
      <TouchableOpacity onPress={onPress}>
        <Text style={dayStyle}>{date.date.day}</Text>
      </TouchableOpacity>
    );
  };
  return (
    <Actionsheet isOpen={open} onClose={() => onClose(0)}>
      <Actionsheet.Content>
        <Calendar
          style={{ width, height: 500 }}
          /* onDayPress={(day) => {
            onChange(day.dateString);
            onClose(0);
          }} */
          dayComponent={renderDay}
          renderArrow={(direction) =>
            direction === 'left' ? (
              <AntDesignIcons color={color.bible} name="left" size={30} />
            ) : (
              <AntDesignIcons color={color.bible} name="right" size={30} />
            )
          }
          /*  markedDates={{
          [selected]: { selected: true, disableTouchEvent: true },
        }} */
        />
      </Actionsheet.Content>
    </Actionsheet>
  );
}
export default memo(Calender);
