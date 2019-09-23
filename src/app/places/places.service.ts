import { Injectable } from '@angular/core';
import { BehaviorSubject, of } from 'rxjs';
import { take, map, tap, delay, switchMap } from 'rxjs/operators';

import { Place } from './places.model';
import { AuthService } from '../auth/auth.service';
import { HttpClient } from '@angular/common/http';
import { PlaceLocation } from './location.model';


// new Place(
//   'p1',
//   'Mumbai Heights',
//   'In the heart of Mumbai City.',
//   'https://images2.alphacoders.com/593/thumb-1920-593194.jpg',
//   149.99,
//   new Date('2019-01-01'),
//   new Date('2019-12-31'),
//   'xyz'
// ),
// new Place(
//   'p2',
//   'Classic Pune',
//   'A historic place in Pune!',
//   'https://image3.mouthshut.com/images/imagesp/925740392s.jpg',
//   189.99,
//   new Date('2019-01-01'),
//   new Date('2019-12-31'),
//   'abc'
// ),
// new Place(
//   'p3',
//   'Agakhan Palace',
//   'Not your average city trip!',
//   'https://www.hindustantimes.com/rf/image_size_960x540/HT/p2/2017/07/04/Pictures/hindustan-india-sunday-palace-photo-pratham-gokhale_7fde1706-609a-11e7-8e9a-26934b659213.JPG',
//   99.99,
//   new Date('2019-01-01'),
//   new Date('2019-12-31'),
//   'abc'
// )
// ]);

interface PlaceData {
  availableFrom: string;
  availableTill: string;
  description: string;
  imageUrl: string;
  price: number;
  title: string;
  userID: string;
  location: PlaceLocation;
}

@Injectable({
  providedIn: 'root'
})
export class PlacesService {

  // tslint:disable-next-line: variable-name
  private _places = new BehaviorSubject<Place[]>([]);

  constructor(private authService: AuthService, private http: HttpClient) { }

  get places() {
    return this._places.asObservable();
  }

  fetchPlaces() {
    return this.authService.token.pipe(
      take(1),
      switchMap(token => {
      return this.http.get<{ [key: string]: PlaceData }>(`https://ionicbookingsapp.firebaseio.com/offered-places.json?auth=${token}`);
    }),
    map(resData => {
        const places = [];
        for (const key in resData) {
          if (resData.hasOwnProperty(key)) {
            places.push(new Place(
              key,
              resData[key].title,
              resData[key].description,
              resData[key].imageUrl,
              resData[key].price,
              new Date (resData[key].availableFrom),
              new Date (resData[key].availableTill),
              resData[key].userID,
              resData[key].location
              ),
              );
          }
        }
        return places;
      }),
      tap(places => {
        this._places.next(places);
      })
    );
  }

  uploadImage(image: File) {
    const uploadData = new FormData();
    uploadData.append('image', image);

    return this.authService.token.pipe(
      take(1),
      switchMap(token => {
      return this.http.post<{imageUrl: string, imagePath: string}>(
        'https://us-central1-ionicbookingsapp.cloudfunctions.net/storeImage',
        uploadData,
        { headers: { Authorization: 'Bearer ' + token }}
        );
    }));
  }

  addPlace(title: string, description: string, price: number, dateFrom: Date, dateTill: Date, location: PlaceLocation, imageUrl: string) {
    let generatedID: string;
    let newPlace: Place;
    let fetchedUserId: string;
    return this.authService.userId.pipe(take(1),
    switchMap(userId => {
      fetchedUserId = userId;
      return this.authService.token;
    }),
    switchMap(token => {
      if (!fetchedUserId) {
        throw new Error('User not found!');
      }
      newPlace = new Place(
        Math.random().toString(),
        title,
        description,
        imageUrl,
        price,
        dateFrom,
        dateTill,
        fetchedUserId,
        location
        );
      return this.http.post<{name: string}>(
        `https://ionicbookingsapp.firebaseio.com/offered-places.json?auth=${token}`,
        { ...newPlace, id: null});
    }),
    switchMap(resData => {
          generatedID = resData.name;
          return this.places;
        }),
        take(1),
        tap(places => {
          newPlace.id = generatedID;
          this._places.next(places.concat(newPlace));
        })
      );
    // return this.places.pipe(
    //   take(1),
    //   delay(1000),
    //   tap(places => {
    //   this._places.next(places.concat(newPlace));
    // }));
  }

  updatePlace(placeId: string, title: string, description: string) {
    let updatedPlaces: Place[];
    let fetchedToken: string;
    return this.authService.token.pipe(
      take(1),
      switchMap(token => {
        fetchedToken = token;
        return this.places;
      }),
      take(1),
      switchMap(places => {
          if (!places || places.length <= 0) {
            return this.fetchPlaces();
          } else {
            return of(places);
          }
        }),
        switchMap(places => {
          const updatedIndex = places.findIndex(pl => pl.id === placeId);
          updatedPlaces = [...places];
          const oldPlace = updatedPlaces[updatedIndex];
          updatedPlaces[updatedIndex] = new Place(
            oldPlace.id,
            title,
            description,
            oldPlace.imageUrl,
            oldPlace.price,
            oldPlace.availableFrom,
            oldPlace.availableTill,
            oldPlace.userID,
            oldPlace.location
            );
          return this.http.put(`https://ionicbookingsapp.firebaseio.com/offered-places/${placeId}.json?auth=${fetchedToken}`,
            {...updatedPlaces[updatedIndex], id: null}
            );
        }),
        tap(() => {
          this._places.next(updatedPlaces);
        })
      );
    }

  getPlace(id: string) {
    return this.authService.token.pipe(
      take(1),
      switchMap(token => {
      return this.http.get<PlaceData>(`https://ionicbookingsapp.firebaseio.com/offered-places/${id}.json?auth=${token}`);
    }),
    map(placeData => {
        return new Place(
          id,
          placeData.title,
          placeData.description,
          placeData.imageUrl,
          placeData.price,
          new Date(placeData.availableFrom),
          new Date(placeData.availableTill),
          placeData.userID,
          placeData.location
          );
      })
    );
  }
}
