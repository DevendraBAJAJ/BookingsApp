import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { take, delay, tap, switchMap, concat, map } from 'rxjs/operators';

import { Booking } from './booking.model';
import { AuthService } from '../auth/auth.service';
import { HttpClient } from '@angular/common/http';

interface BookingData {
  placeId: string;
  userId: string;
  placeTitle: string;
  placeImage: string;
  firstName: string;
  lastName: string;
  guestNumber: number;
  bookedFrom: Date;
  bookedTill: Date;
}

@Injectable({ providedIn: 'root' })
export class BookingService {
  // tslint:disable-next-line: variable-name
  private _bookings = new BehaviorSubject<Booking[]>([]);

  constructor(
    private authService: AuthService,
    private http: HttpClient) {}

  get bookings() {
    return this._bookings.asObservable();
  }

  fetchBookings() {
    let fetchedUserId: string;
    return this.authService.userId.pipe(
      take(1),
      switchMap(userId => {
      if (!userId) {
        throw new Error('User not found!');
      }
      fetchedUserId = userId;
      return this.authService.token;
    }),
    take(1),
    switchMap(token => {
      return this.http.get<{ [key: string]: BookingData }>(
        `https://ionicbookingsapp.firebaseio.com/my-bookings.json?orderBy="userId"&equalTo="${fetchedUserId}"&auth=${token}`);
    }),
    map(resData => {
        const bookings = [];
        for (const key in resData) {
          if (resData.hasOwnProperty(key)) {
            bookings.push(new Booking(
              key,
              resData[key].placeId,
              resData[key].userId,
              resData[key].placeTitle,
              resData[key].placeImage,
              resData[key].firstName,
              resData[key].lastName,
              resData[key].guestNumber,
              new Date (resData[key].bookedFrom),
              new Date (resData[key].bookedTill),
              ));
          }
        }
        return bookings;
      }),
      tap(bookings => {
        console.log(bookings);
        this._bookings.next(bookings);
      })
    );
  }

  addBooking(
    placeId: string,
    placeTitle: string,
    placeImage: string,
    firstName: string,
    lastName: string,
    guestNumber: number,
    dateFrom: Date,
    dateTo: Date) {
      let generatedID: string;
      let newBooking: Booking;
      let fetchedUserID: string;
      return this.authService.userId
      .pipe(
        take(1),
        switchMap(userId => {
        if (!userId) {
          throw new Error('User not found!');
        }
        fetchedUserID = userId;
        return this.authService.token;
      }),
      take(1),
      switchMap(token => {
        newBooking = new Booking(
          Math.random().toString(),
          placeId,
          fetchedUserID,
          placeTitle,
          placeImage,
          firstName,
          lastName,
          guestNumber,
          dateFrom,
          dateTo,
        );
        return this.http.post<{name: string}>(
          `https://ionicbookingsapp.firebaseio.com/my-bookings.json?auth=${token}`,
          { ...newBooking, id: null}
          );
      }),
      switchMap(resData => {
            generatedID = resData.name;
            console.log(resData);
            return this.bookings;
          }),
          take(1),
          tap(bookings => {
            newBooking.id = generatedID;
            this._bookings.next(bookings.concat(newBooking));
          })
        );
  }

  cancelBooking(bookingId: string) {
    return this.authService.token.pipe(
      take(1),
      switchMap(token => {
        return this.http.delete(`https://ionicbookingsapp.firebaseio.com/my-bookings/${bookingId}.json?auth=${token}`);
      }),
      switchMap(() => {
        return this.bookings;
      }),
      take(1),
      tap(bookings => {
      this._bookings.next(bookings.filter(b => b.id !== bookingId));
    }));
  }
}
