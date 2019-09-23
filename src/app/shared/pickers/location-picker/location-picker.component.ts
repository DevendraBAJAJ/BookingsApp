import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { ModalController, ActionSheetController, AlertController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';

import { MapModalComponent } from '../../map-modal/map-modal.component';
import { environment } from '../../../../environments/environment';
import { map, switchMap } from 'rxjs/operators';
import { PlaceLocation, Coordinates } from 'src/app/places/location.model';
import { of } from 'rxjs';
import { Capacitor, Plugins } from '@capacitor/core';

@Component({
  selector: 'app-location-picker',
  templateUrl: './location-picker.component.html',
  styleUrls: ['./location-picker.component.scss'],
})
export class LocationPickerComponent implements OnInit {
  // tslint:disable-next-line: new-parens
  @Output() locationPick = new EventEmitter<PlaceLocation>();
  @Input() showPreview = false;
  selectedLocationImage: string;
  isLoading = false;

  constructor(
    private modalCtrl: ModalController,
    private http: HttpClient,
    private actionSheetCtrl: ActionSheetController,
    private alertCtrl: AlertController
    ) { }

  ngOnInit() {}

  onPickLocation() {
    this.actionSheetCtrl.create({
      header: 'Please choose.',
      buttons: [
        { text: 'Auto locate', handler: () => {
          this.locateUser();
        } },
        { text: 'Pick on map', handler: () => {
          this.openMap();
        } },
        { text: 'Cancel', role: 'calcel' }
      ]
    }).then(actionSheetEl => {
      actionSheetEl.present();
    });
  }

  private locateUser() {
    if (!Capacitor.isPluginAvailable('Geolocation')) {
      this.showGeoLocationError();
      return;
    }
    this.isLoading = true;
    Plugins.Geolocation.getCurrentPosition()
    .then(geoPosition => {
      const coordinates: Coordinates = {lat: geoPosition.coords.latitude, lng: geoPosition.coords.longitude};
      this.setPlaceLocation(coordinates.lat, coordinates.lng);
      this.isLoading = false;
    })
    .catch(err => {
      this.isLoading = false;
      this.showGeoLocationError();
    });
  }

  private showGeoLocationError() {
    this.alertCtrl.create({
      header: 'Could not fetch location.',
      message: 'Please use map to set a location',
      buttons: [{
        text: 'Ok'
      }]
    }).then(alertEl => {
      alertEl.present();
    });
  }

  private setPlaceLocation(lat: number, lng: number) {
    const pickedLocation: PlaceLocation = {
      // tslint:disable-next-line: object-literal-shorthand
      lat: lat,
      // tslint:disable-next-line: object-literal-shorthand
      lng: lng,
      address: null,
      staticMapImageUrl: null
    };
    this.isLoading = true;
    this.getAddress(lat, lng)
    .pipe(switchMap(address => {
      pickedLocation.address = address;
      return of(this.getMapImage(pickedLocation.lat, pickedLocation.lng, 14));
    })).subscribe(staticMapImageUrl => {
      pickedLocation.staticMapImageUrl = staticMapImageUrl;
      this.selectedLocationImage = staticMapImageUrl;
      this.isLoading = false;
      this.locationPick.emit(pickedLocation);
    });
  }

  private openMap() {
    this.modalCtrl.create({component: MapModalComponent}).then(modalEl => {
      modalEl.onDidDismiss().then(modalData => {
        if (!modalData.data) {
          return;
        }
        const coordinates: Coordinates = {
          lat: modalData.data.lat,
          lng: modalData.data.lng
        };
        this.setPlaceLocation(coordinates.lat, coordinates.lng);
      });
      modalEl.present();
    });
  }

  private getAddress(lat: number, lng: number) {
    return this.http.get<any>(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${environment.googleMapsAPIKey}`).
    pipe(map(geoData => {
      if (!geoData || !geoData.results || geoData.results.length === 0) {
        return null;
      }
      return geoData.results[0].formatted_address;
    }));
  }

  private getMapImage(lat: number, lng: number, zoom: number) {
    return `https://maps.googleapis.com/maps/api/staticmap?center=${lat}, ${lng}&zoom=${zoom}&size=500x300&maptype=roadmap
    &markers=color:red%7Clabel:Place%7C${lat},${lng}
    &key=${environment.googleMapsAPIKey}`;
  }
}
